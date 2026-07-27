import type { Request, Response } from "express";
import { ZodError } from "zod";
import { registerTeamSchema } from "../validators/team.validator";
import { registerTeam } from "../services/team.service";

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