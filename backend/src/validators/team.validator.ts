import { z } from "zod";

const collegeSchema = z
  .object({
    collegeId: z.string().trim().min(1).optional(),
    collegeName: z.string().trim().min(2).max(255).optional(),
  })
  .refine(
    (college) =>
      Boolean(college.collegeId) || Boolean(college.collegeName),
    {
      message: "Either collegeId or collegeName is required",
    }
  );

const teamMemberSchema = z.object({
  role: z.enum(["LEADER", "MEMBER"]),

  fullName: z.string().trim().min(2).max(150),

  email: z.string().trim().email().max(255).transform((email) => email.toLowerCase()),

  mobileNumber: z.string().trim().min(10).max(20),

  college: collegeSchema,

  region: z.string().trim().min(2).max(100),

  branch: z.string().trim().min(2).max(150),

  yearOfStudy: z.number().int().min(1).max(6),
});

export const registerTeamSchema = z
  .object({
    teamName: z.string().trim().min(2).max(150),

    domainId: z.number().int().positive(),

    declarationAccepted: z.literal(true),

    members: z.array(teamMemberSchema).min(3).max(4),
  })
  .superRefine((data, ctx) => {
    const leaders = data.members.filter(
      (member) => member.role === "LEADER"
    );

    if (leaders.length !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["members"],
        message: "Exactly one team leader is required",
      });
    }

    const emails = data.members.map((member) => member.email);

    if (new Set(emails).size !== emails.length) {
      ctx.addIssue({
        code: "custom",
        path: ["members"],
        message: "Member emails must be unique",
      });
    }
  });

export type RegisterTeamInput = z.infer<typeof registerTeamSchema>;

// Used when updating an existing draft — same shape as registration.
export const updateTeamSchema = registerTeamSchema;
export type UpdateTeamInput = RegisterTeamInput;

export const continueApplicationSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .max(255)
    .transform((email) => email.toLowerCase()),
});

export type ContinueApplicationInput = z.infer<typeof continueApplicationSchema>;
