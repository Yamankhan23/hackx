import type { Request, Response } from "express";
import { ZodError } from "zod";
import { registerTeamSchema } from "../validators/team.validator";
import { registerTeam, sendTeamVerificationEmails, verifyEmail } from "../services/team.service";

export const registerTeamController = async (
  req: Request,
  res: Response
) => {
  try {
    const validatedData = registerTeamSchema.parse(req.body);

    const result = await registerTeam(validatedData);

    return res.status(201).json({
      success: true,
      message:
        "Team registration created successfully. All members must verify their email addresses to continue.",
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

    console.error("Team registration error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to create team registration";

    return res.status(400).json({
      success: false,
      message,
    });
  }
};

export const sendVerificationEmailsController = async (
  req: Request,
  res: Response
) => {
  try {
    const { teamId } = req.params;

    if (typeof teamId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid team ID",
      });
    }

    const result = await sendTeamVerificationEmails(teamId);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Send verification error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to send verification emails",
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
      message: "Email verified successfully",
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
        return res.status(400).json({
          success: false,
          code: "INVALID_TOKEN",
          message: "This verification link is invalid.",
        });
      }
      if (error.message === "ALREADY_VERIFIED") {
        return res.status(200).json({
          success: true,
          code: "ALREADY_VERIFIED",
          message: "This email address has already been verified.",
        });
      }
    }

    console.error("Email verification error:", error);
    return res.status(500).json({
      success: false,
      code: "SERVER_ERROR",
      message: "Failed to verify email. Please try again.",
    });
  }
};