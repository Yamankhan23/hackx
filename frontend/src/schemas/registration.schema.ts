import { z } from "zod";

const memberSchema = z.object({
  role: z.enum(["LEADER", "MEMBER"]),
  fullName: z.string().trim().min(2, "Full name is required").max(150),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .max(255)
    .transform((value) => value.toLowerCase()),
  mobileNumber: z
    .string()
    .trim()
    .min(8, "Mobile number is required")
    .max(20, "Enter a valid mobile number"),
  selectedCollegeId: z.string().trim().optional(),
  selectedCollegeName: z.string().trim().optional(),
  collegeName: z.string().trim().optional(),
  region: z.string().trim().min(2, "Region is required").max(100),
  branch: z.string().trim().min(2, "Branch is required").max(150),
  yearOfStudy: z.string().trim().min(1, "Year of study is required"),
});

export const registrationSchema = z
  .object({
    teamName: z
      .string()
      .trim()
      .min(2, "Team name is required")
      .max(150, "Team name is too long"),
    domainId: z.string().trim().min(1, "Domain is required"),
    declarationAccepted: z
      .boolean()
      .optional()
      .refine((value) => value === true, {
        message: "Declaration acceptance is required",
      }),
    members: z.array(memberSchema).min(3).max(4),
  })
  .superRefine((data, ctx) => {
    const normalizedEmails = data.members.map((member) =>
      member.email.toLowerCase()
    );

    if (new Set(normalizedEmails).size !== normalizedEmails.length) {
      ctx.addIssue({
        code: "custom",
        path: ["members"],
        message: "Team member emails must be unique",
      });
    }

    data.members.forEach((member, index) => {
      const hasSelectedCollege = member.selectedCollegeId && member.selectedCollegeName;
      const hasManualEntry = member.collegeName && member.collegeName.trim().length >= 2;

      if (!hasSelectedCollege && !hasManualEntry) {
        ctx.addIssue({
          code: "custom",
          path: ["members", index, "collegeName"],
          message: "Select a college from the list or enter the name manually",
        });
      }
    });
  });

export type RegistrationFormValues = z.input<typeof registrationSchema>;
