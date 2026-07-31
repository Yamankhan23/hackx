import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  colleges,
  domains,
  teamMembers,
  teams,
} from "../db/migrations/schema";
import type { RegisterTeamInput } from "../validators/team.validator";
import {
  generateVerificationToken,
  hashVerificationToken,
} from "../lib/verification-token";

import { sendVerificationEmail } from "./email.service";

const VERIFICATION_EXPIRY_HOURS = 24;

const generateReadableId = (prefix: string) => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(1000 + Math.random() * 9000);

  return `${prefix}-${timestamp}${random}`;
};

export const registerTeam = async (input: RegisterTeamInput) => {
  const normalizedEmails = input.members.map((member) =>
    member.email.toLowerCase()
  );

  return await db.transaction(async (tx) => {
    // ---------------------------------------------------------
    // 1. Validate domain
    // ---------------------------------------------------------

    const [domain] = await tx
      .select({
        id: domains.id,
      })
      .from(domains)
      .where(eq(domains.id, input.domainId))
      .limit(1);

    if (!domain) {
      throw new Error("Invalid domain selected");
    }

    // ---------------------------------------------------------
    // 2. Check globally unique participant emails
    // ---------------------------------------------------------

    const existingMembers = await tx
      .select({
        email: teamMembers.email,
      })
      .from(teamMembers)
      .where(inArray(teamMembers.email, normalizedEmails));

    if (existingMembers.length > 0) {
      throw new Error(
        "One or more team member emails are already registered"
      );
    }

    // ---------------------------------------------------------
    // 3. Resolve colleges
    // ---------------------------------------------------------

    const resolvedCollegeIds = new Map<string, number>();

    for (const member of input.members) {
      const college = member.college;

      if (college.collegeId) {
        const [existingCollege] = await tx
          .select({
            id: colleges.id,
          })
          .from(colleges)
          .where(eq(colleges.collegeId, college.collegeId))
          .limit(1);

        if (!existingCollege) {
          throw new Error(
            `College ${college.collegeId} does not exist`
          );
        }

        resolvedCollegeIds.set(
          member.email,
          Number(existingCollege.id)
        );
      } else if (college.collegeName) {
        const normalizedCollegeName = college.collegeName.trim();

        const [existingCollege] = await tx
          .select({
            id: colleges.id,
          })
          .from(colleges)
          .where(eq(colleges.name, normalizedCollegeName))
          .limit(1);

        if (existingCollege) {
          resolvedCollegeIds.set(
            member.email,
            Number(existingCollege.id)
          );
        } else {
          const collegeId = generateReadableId("COL");

          const [newCollege] = await tx
            .insert(colleges)
            .values({
              collegeId,
              name: normalizedCollegeName,
              region: member.region,
            })
            .returning({
              id: colleges.id,
            });

          resolvedCollegeIds.set(
            member.email,
            Number(newCollege.id)
          );
        }
      }
    }

    // ---------------------------------------------------------
    // 4. Create Team
    // ---------------------------------------------------------

    const teamId = generateReadableId("TEAM");
    const registrationId = generateReadableId("REG");

    const [team] = await tx
      .insert(teams)
      .values({
        teamId,
        registrationId,
        teamName: input.teamName.trim(),
        domainId: input.domainId,
        status: "DRAFT",
        declarationAccepted: true,
        declarationAcceptedAt: new Date().toISOString(),
      })
      .returning({
        id: teams.id,
        teamId: teams.teamId,
        registrationId: teams.registrationId,
        teamName: teams.teamName,
        status: teams.status,
      });

    // ---------------------------------------------------------
    // 5. Create Team Members
    // ---------------------------------------------------------

    await tx.insert(teamMembers).values(
      input.members.map((member) => ({
        teamId: team.id,

        role: member.role,

        fullName: member.fullName.trim(),

        email: member.email.toLowerCase(),

        mobileNumber: member.mobileNumber.trim(),

        collegeId: resolvedCollegeIds.get(member.email)!,

        region: member.region.trim(),

        branch: member.branch.trim(),

        yearOfStudy: member.yearOfStudy,
      }))
    );

    // ---------------------------------------------------------
    // 6. Return clean response
    // ---------------------------------------------------------

    return {
      teamId: team.teamId,
      registrationId: team.registrationId,
      teamName: team.teamName,
      status: team.status,

      members: input.members.map((member) => ({
        name: member.fullName,
        email: member.email,
        emailVerified: false,
      })),
    };
  });
};

export const sendTeamVerificationEmails = async (
  teamReadableId: string
) => {
  const team = await db.query.teams.findFirst({
    where: (teams, { eq }) =>
      eq(teams.teamId, teamReadableId),
  });

  if (!team) {
    throw new Error("Team not found");
  }

  const members = await db.query.teamMembers.findMany({
    where: (teamMembers, { eq }) =>
      eq(teamMembers.teamId, team.id),
  });

  if (members.length === 0) {
    throw new Error("No team members found");
  }

  for (const member of members) {
    if (member.emailVerifiedAt) {
      continue;
    }

    const token = generateVerificationToken();
    const tokenHash = hashVerificationToken(token);

    const expiresAt = new Date(
  Date.now() + VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000
).toISOString();

    await db
      .update(teamMembers)
      .set({
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiresAt: expiresAt,
      })
      .where(eq(teamMembers.id, member.id));

    await sendVerificationEmail({
      email: member.email,
      name: member.fullName,
      verificationToken: token,
    });
  }

  return {
    teamId: team.teamId,
    message: "Verification emails sent successfully",
  };
};