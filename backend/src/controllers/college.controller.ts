import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { colleges } from "../db/migrations/schema";

export const getColleges = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const collegeList = await db
      .select({
        id: colleges.id,
        collegeId: colleges.collegeId,
        name: colleges.name,
        university: colleges.university,
        region: colleges.region,
      })
      .from(colleges)
      .where(eq(colleges.isActive, true));

    res.status(200).json({
      success: true,
      data: collegeList,
    });
  } catch (error) {
    _req.log.error({ err: error }, "Error fetching colleges");

    res.status(500).json({
      success: false,
      message: "Failed to fetch colleges",
    });
  }
};
