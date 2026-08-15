import { z } from "zod";

export const adminLoginSchema = z.object({
  email: z.string().email().transform((email) => email.toLowerCase()),
  password: z.string().min(1, "Password is required"),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

export const createDomainSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(1000).optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateDomainSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  description: z.string().trim().max(1000).optional(),
  isActive: z.boolean().optional(),
});

export const createCollegeSchema = z.object({
  collegeId: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(255),
  university: z.string().trim().max(255).optional(),
  region: z.string().trim().min(1).max(100),
  isActive: z.boolean().optional().default(true),
});

export const updateCollegeSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  university: z.string().trim().max(255).optional(),
  region: z.string().trim().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});

export const createRoundSchema = z.object({
  roundId: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(100),
  roundNumber: z.number().int().positive(),
  type: z.enum(["ONLINE", "OFFLINE"]),
  description: z.string().trim().max(1000).optional(),
  startAt: z.string().datetime({ offset: true }).optional(),
  endAt: z.string().datetime({ offset: true }).optional(),
  status: z.enum(["UPCOMING", "ACTIVE", "COMPLETED"]).optional().default("UPCOMING"),
});

export const updateRoundSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  type: z.enum(["ONLINE", "OFFLINE"]).optional(),
  description: z.string().trim().max(1000).optional(),
  startAt: z.string().datetime({ offset: true }).optional(),
  endAt: z.string().datetime({ offset: true }).optional(),
  status: z.enum(["UPCOMING", "ACTIVE", "COMPLETED"]).optional(),
});

export const createProblemStatementSchema = z.object({
  problemStatementId: z.string().trim().min(1).max(30),
  domainId: z.number().int().positive().optional(),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1),
  isPublished: z.boolean().optional().default(false),
});

export const updateTeamStatusSchema = z.object({
  status: z.enum(["DRAFT", "PENDING_PAYMENT", "CONFIRMED", "CANCELLED"]),
});

export const updateProblemStatementSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().min(1).optional(),
  domainId: z.number().int().positive().optional(),
  isPublished: z.boolean().optional(),
});