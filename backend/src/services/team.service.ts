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
          // Short temporary ID because colleges.college_id is VARCHAR(20)
          const temporaryCollegeId = `T-${Date.now()}`;

          const [newCollege] = await tx
            .insert(colleges)
            .values({
              collegeId: temporaryCollegeId,
              name: normalizedCollegeName,
              region: member.region,
            })
            .returning({
              id: colleges.id,
            });

          // Generate final readable ID from database-generated ID
          const readableCollegeId = `COL-${String(
            newCollege.id
          ).padStart(3, "0")}`;

          await tx
            .update(colleges)
            .set({
              collegeId: readableCollegeId,
            })
            .where(eq(colleges.id, newCollege.id));

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

    // Short temporary ID because teams.team_id is VARCHAR(30)
    const temporaryTeamId = `TEMP-${Date.now()}`;

    const [team] = await tx
      .insert(teams)
      .values({
        teamId: temporaryTeamId,
        teamName: input.teamName.trim(),
        domainId: input.domainId,
        status: "DRAFT",
        declarationAccepted: true,
        declarationAcceptedAt: new Date().toISOString(),
      })
      .returning({
        id: teams.id,
        teamName: teams.teamName,
        status: teams.status,
      });

    // Generate final readable IDs from database-generated ID
    const teamId = `TEAM-${String(team.id).padStart(3, "0")}`;
    const registrationId = `REG-${String(team.id).padStart(3, "0")}`;

    await tx
      .update(teams)
      .set({
        teamId,
        registrationId,
      })
      .where(eq(teams.id, team.id));

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
      teamId,
      registrationId,
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

export const verifyEmail = async (token: string) => {
  const tokenHash = hashVerificationToken(token);

  const [member] = await db
    .select({
      id: teamMembers.id,
      email: teamMembers.email,
      fullName: teamMembers.fullName,
      emailVerifiedAt: teamMembers.emailVerifiedAt,
      emailVerificationExpiresAt: teamMembers.emailVerificationExpiresAt,
    })
    .from(teamMembers)
    .where(eq(teamMembers.emailVerificationTokenHash, tokenHash))
    .limit(1);

  if (!member) {
    throw new Error("INVALID_TOKEN");
  }

  if (member.emailVerifiedAt) {
    throw new Error("ALREADY_VERIFIED");
  }

  if (
    !member.emailVerificationExpiresAt ||
    new Date(member.emailVerificationExpiresAt) < new Date()
  ) {
    throw new Error("TOKEN_EXPIRED");
  }

  await db
    .update(teamMembers)
    .set({
      emailVerifiedAt: new Date().toISOString(),
      emailVerificationTokenHash: null,
      emailVerificationExpiresAt: null,
    })
    .where(eq(teamMembers.id, member.id));

  return {
    email: member.email,
    name: member.fullName,
  };
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