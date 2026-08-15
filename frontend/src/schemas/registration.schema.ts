import { z } from "zod";

const memberSchema = z.object({
  // Present when editing an existing draft member (loaded via resume);
  // absent for newly added members. Lets the backend match by id instead
  // of by email, which stays correct even if the member edits their email.
  id: z.number().optional(),
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
    .regex(/^\+?[0-9]{10,15}$/, "Enter a valid mobile number (10-15 digits)"),
  selectedCollegeId: z.string().trim().optional(),
  selectedCollegeName: z.string().trim().optional(),
  collegeName: z.string().trim().optional(),
  region: z.string().trim().min(2, "Region is required").max(100),
  branch: z.string().trim().min(2, "Branch is required").max(150),
  yearOfStudy: z
    .string()
    .trim()
    .regex(/^[1-6]$/, "Year of study must be between 1 and 6"),
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
