import type { Request, Response } from "express";
import { ZodError } from "zod";
import {
  continueApplicationSchema,
  registerTeamSchema,
  updateTeamSchema,
} from "../validators/team.validator";
import {
  confirmRegistration,
  registerTeam,
  resendVerificationEmail,
  resumeApplication,
  sendResumeLink,
  updateTeam,
  verifyEmail,
} from "../services/team.service";
import { friendlyDbErrorMessage } from "../lib/db-errors";

export const registerTeamController = async (
  req: Request,
  res: Response
) => {
  try {
    const validatedData = registerTeamSchema.parse(req.body);

    const result = await registerTeam(validatedData);

    return res.status(201).json({
      success: true,
      message: result.resumeToken
        ? "Team registration submitted. Check your email to confirm your spot."
        : "Team registration submitted, but we couldn't send your confirmation email right away. Use \"Continue Application\" with your email to get your link.",
      data: result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid registration data",
        errors: error.issues,
      });
    }

    req.log.error({ err: error }, "Team registration error");

    const message =
      friendlyDbErrorMessage(error) ??
      (error instanceof Error
        ? error.message
        : "Failed to create team registration");

    return res.status(400).json({
      success: false,
      message,
    });
  }
};

export const verifyEmailController = async (
  req: Request,
  res: Response
) => {
  try {
    const token = String(req.query.token ?? "").trim();

    if (!token) {
      return res.status(400).json({
        success: false,
        code: "INVALID_TOKEN",
        message: "Verification token is required",
      });
    }

    const result = await verifyEmail(token);

    return res.status(200).json({
      success: true,
      code: result.alreadyVerified ? "ALREADY_VERIFIED" : undefined,
      message: result.alreadyVerified
        ? "This email address has already been verified."
        : "Email verified successfully",
      data: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "TOKEN_EXPIRED") {
        return res.status(410).json({
          success: false,
          code: "TOKEN_EXPIRED",
          message: "This verification link has expired. Please request a new one.",
        });
      }
      if (error.message === "INVALID_TOKEN") {
        return res.status(404).json({
          success: false,
          code: "INVALID_TOKEN",
          message: "This verification link is invalid.",
        });
      }
    }

    req.log.error({ err: error }, "Email verification error");
    return res.status(500).json({
      success: false,
      code: "SERVER_ERROR",
      message: "Failed to verify email. Please try again.",
    });
  }
};

export const resendVerificationEmailController = async (
  req: Request,
  res: Response
) => {
  try {
    const { email } = continueApplicationSchema.parse(req.body);
    const result = await resendVerificationEmail(email);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid email",
        errors: error.issues,
      });
    }

    req.log.error({ err: error }, "Resend verification error");

    return res.status(400).json({
      success: false,
      message: "Failed to resend verification email",
    });
  }
};

export const continueApplicationController = async (
  req: Request,
  res: Response
) => {
  try {
    const { email } = continueApplicationSchema.parse(req.body);

    const result = await sendResumeLink(email);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid email",
        errors: error.issues,
      });
    }

    req.log.error({ err: error }, "Continue application error");

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to send resume link",
    });
  }
};

export const resumeApplicationController = async (
  req: Request,
  res: Response
) => {
  try {
    const { token } = req.params;

    if (typeof token !== "string" || !token) {
      return res.status(400).json({
        success: false,
        message: "Invalid resume token",
      });
    }

    const result = await resumeApplication(token);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    req.log.error({ err: error }, "Resume application error");

    return res.status(404).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to load application draft",
    });
  }
};

export const confirmRegistrationController = async (
  req: Request,
  res: Response
) => {
  try {
    const { token } = req.params;

    if (typeof token !== "string" || !token) {
      return res.status(400).json({
        success: false,
        message: "Invalid confirmation token",
      });
    }

    const result = await confirmRegistration(token);

    return res.status(200).json({
      success: true,
      message: result.alreadyConfirmed
        ? "This registration has already been confirmed."
        : "Registration confirmed successfully.",
      data: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "TOKEN_EXPIRED") {
        return res.status(410).json({
          success: false,
          code: "TOKEN_EXPIRED",
          message: "This confirmation link has expired. Please request a new one.",
        });
      }
      if (error.message === "INVALID_TOKEN") {
        return res.status(404).json({
          success: false,
          code: "INVALID_TOKEN",
          message: "This confirmation link is invalid.",
        });
      }
    }

    req.log.error({ err: error }, "Confirm registration error");

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to confirm registration",
    });
  }
};

export const updateTeamController = async (
  req: Request,
  res: Response
) => {
  try {
    const { token } = req.params;

    if (typeof token !== "string" || !token) {
      return res.status(400).json({
        success: false,
        message: "Invalid resume token",
      });
    }

    const validatedData = updateTeamSchema.parse(req.body);

    const result = await updateTeam(token, validatedData);

    return res.status(200).json({
      success: true,
      message: "Team draft updated successfully.",
      data: result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid registration data",
        errors: error.issues,
      });
    }

    req.log.error({ err: error }, "Update team error");

    const friendlyMessage = friendlyDbErrorMessage(error);

    if (friendlyMessage) {
      return res.status(400).json({ success: false, message: friendlyMessage });
    }

    if (error instanceof Error) {
      if (error.message === "INVALID_TOKEN") {
        return res.status(404).json({
          success: false,
          message: "This link is invalid.",
        });
      }
      if (error.message === "TOKEN_EXPIRED") {
        return res.status(410).json({
          success: false,
          message: "This link has expired. Please request a new one.",
        });
      }
      if (error.message === "Team not found") {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (error.message.includes("already been submitted")) {
        return res.status(409).json({ success: false, message: error.message });
      }
    }

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update team draft",
    });
  }
};
