

import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";

import { db } from "../db";
import { admins } from "../db/migrations/schema";

type AdminTokenPayload = {
  adminId: number;
  role: string;
};

export const requireAdminAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const token = authHeader.slice(7);
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      res.status(500).json({
        success: false,
        message: "Server configuration error",
      });
      return;
    }

    const decoded = jwt.verify(token, jwtSecret) as AdminTokenPayload;

    if (!decoded?.adminId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const [admin] = await db
      .select({
        id: admins.id,
        adminId: admins.adminId,
        name: admins.name,
        email: admins.email,
        role: admins.role,
        isActive: admins.isActive,
      })
      .from(admins)
      .where(eq(admins.id, decoded.adminId))
      .limit(1);

    if (!admin || !admin.isActive) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    (req as Request & { admin?: typeof admin }).admin = admin;
    next();
  } catch {
    res.status(401).json({ success: false, message: "Unauthorized" });
  }
};
