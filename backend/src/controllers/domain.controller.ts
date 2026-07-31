import { Request, Response } from "express";
import { db } from "../db";
import { domains } from "../db/migrations/schema";

export const getDomains = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const domainList = await db
      .select({
        id: domains.id,
        name: domains.name,
      })
      .from(domains);

    res.status(200).json({
      success: true,
      data: domainList,
    });
  } catch (error) {
    console.error("Error fetching domains:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch domains",
    });
  }
};