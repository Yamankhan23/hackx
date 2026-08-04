import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  colleges,
  domains,
  teamMembers,
  teams,
} from "../db/migrations/schema";
import type {
  RegisterTeamInput,
  UpdateTeamInput,
} from "../validators/team.validator";
import {
  generateVerificationToken,
  hashVerificationToken,
} from "../lib/verification-token";

import {
  sendApplicationResumeEmail,
  sendVerificationEmail,
} from "./email.service";

const VERIFICATION_EXPIRY_HOURS = 24;

// Shared helper: resolve an existing college or upsert a new one for each member.
const resolveColleges = async (
  tx: any,
  members: RegisterTeamInput["members"]
) => {
  const resolvedCollegeIds = new Map<string, number>();

  for (const member of members) {
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

  return resolvedCollegeIds;
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

    const resolvedCollegeIds = await resolveColleges(
      tx,
      input.members
    );

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

// ---------------------------------------------------------
// Continue your application (resume draft)
// ---------------------------------------------------------

export const sendResumeLink = async (leaderEmail: string) => {
  const normalizedEmail = leaderEmail.toLowerCase();

  // Find the leader of a DRAFT team by email
  const [leader] = await db
    .select({
      id: teamMembers.id,
      fullName: teamMembers.fullName,
      email: teamMembers.email,
      teamId: teamMembers.teamId,
    })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.email, normalizedEmail),
        eq(teamMembers.role, "LEADER")
      )
    )
    .limit(1);

  // Always respond generically (do not reveal whether the email exists)
  if (!leader) {
    return {
      message: "If this email has a draft application, a resume link has been sent.",
    };
  }

  const [team] = await db
    .select({
      id: teams.id,
      teamId: teams.teamId,
      teamName: teams.teamName,
      status: teams.status,
    })
    .from(teams)
    .where(eq(teams.id, leader.teamId))
    .limit(1);

  if (!team || team.status !== "DRAFT") {
    return {
      message: "If this email has a draft application, a resume link has been sent.",
    };
  }

  // Store a fresh verification token on the leader row so it can be validated later
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
    .where(eq(teamMembers.id, leader.id));

  await sendApplicationResumeEmail({
    email: leader.email,
    name: leader.fullName,
    teamName: team.teamName,
    resumeToken: token,
  });

  return {
    message: "If this email has a draft application, a resume link has been sent.",
  };
};

export const resumeApplication = async (resumeToken: string) => {
  const tokenHash = hashVerificationToken(resumeToken);

  const [leader] = await db
    .select({
      id: teamMembers.id,
      fullName: teamMembers.fullName,
      email: teamMembers.email,
      role: teamMembers.role,
      emailVerifiedAt: teamMembers.emailVerifiedAt,
      emailVerificationExpiresAt: teamMembers.emailVerificationExpiresAt,
      teamId: teamMembers.teamId,
    })
    .from(teamMembers)
    .where(eq(teamMembers.emailVerificationTokenHash, tokenHash))
    .limit(1);

  if (!leader) {
    throw new Error("Invalid or expired resume link.");
  }

  if (
    leader.emailVerificationExpiresAt &&
    new Date(leader.emailVerificationExpiresAt).getTime() < Date.now()
  ) {
    throw new Error("This resume link has expired. Please request a new one.");
  }

  const [team] = await db
    .select({
      id: teams.id,
      teamId: teams.teamId,
      registrationId: teams.registrationId,
      teamName: teams.teamName,
      domainId: teams.domainId,
      status: teams.status,
      declarationAccepted: teams.declarationAccepted,
      declarationAcceptedAt: teams.declarationAcceptedAt,
      createdAt: teams.createdAt,
      updatedAt: teams.updatedAt,
    })
    .from(teams)
    .where(eq(teams.id, leader.teamId))
    .limit(1);

  if (!team) {
    throw new Error("Team not found for this resume link.");
  }

  // Mark the leader as verified now that they clicked the resume link
  if (!leader.emailVerifiedAt) {
    await db
      .update(teamMembers)
      .set({ emailVerifiedAt: new Date().toISOString() })
      .where(eq(teamMembers.id, leader.id));
  }

  // If the team has already been submitted, just notify the leader.
  if (team.status !== "DRAFT") {
    return {
      alreadySubmitted: true,
      status: team.status,
      message:
        team.status === "CONFIRMED"
          ? "Your details are already recorded. Contact admin for any query."
          : "Your application has already been submitted.",
      team: {
        teamId: team.teamId,
        registrationId: team.registrationId,
        teamName: team.teamName,
        status: team.status,
      },
    };
  }

  const members = await db
    .select({
      id: teamMembers.id,
      role: teamMembers.role,
      fullName: teamMembers.fullName,
      email: teamMembers.email,
      mobileNumber: teamMembers.mobileNumber,
      collegeId: teamMembers.collegeId,
      region: teamMembers.region,
      branch: teamMembers.branch,
      yearOfStudy: teamMembers.yearOfStudy,
      emailVerifiedAt: teamMembers.emailVerifiedAt,
    })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, team.id));

  const [domain] = await db
    .select({
      id: domains.id,
      name: domains.name,
    })
    .from(domains)
    .where(eq(domains.id, team.domainId))
    .limit(1);

  // Fetch college info for each member to pre-fill the form
  const collegeIds = members.map((member) => member.collegeId);
  const collegeList =
    collegeIds.length > 0
      ? await db
          .select({
            id: colleges.id,
            collegeId: colleges.collegeId,
            name: colleges.name,
            university: colleges.university,
            region: colleges.region,
          })
          .from(colleges)
          .where(inArray(colleges.id, collegeIds))
      : [];

  const collegeById = new Map(
    collegeList.map((college) => [Number(college.id), college])
  );

  return {
    alreadySubmitted: false,
    team: {
      teamId: team.teamId,
      registrationId: team.registrationId,
      teamName: team.teamName,
      status: team.status,
    },
    draft: {
      teamName: team.teamName,
      domainId: team.domainId,
      domainName: domain?.name ?? "",
      declarationAccepted: Boolean(team.declarationAccepted),
      members: members.map((member) => {
        const college = collegeById.get(Number(member.collegeId));

        return {
          id: member.id,
          role: member.role,
          fullName: member.fullName,
          email: member.email,
          mobileNumber: member.mobileNumber,
          collegeId: college?.collegeId ?? "",
          collegeName: college?.name ?? "",
          region: member.region,
          branch: member.branch,
          yearOfStudy: member.yearOfStudy,
          emailVerifiedAt: member.emailVerifiedAt,
        };
      }),
    },
  };
};

export const updateTeam = async (
  teamId: string,
  input: UpdateTeamInput
) => {
  const [team] = await db
    .select({
      id: teams.id,
      teamId: teams.teamId,
      status: teams.status,
    })
    .from(teams)
    .where(eq(teams.teamId, teamId))
    .limit(1);

  if (!team) {
    throw new Error("Team not found");
  }

  if (team.status !== "DRAFT") {
    throw new Error(
      "This application has already been submitted and can no longer be edited."
    );
  }

  return await db.transaction(async (tx) => {
    const [domain] = await tx
      .select({ id: domains.id })
      .from(domains)
      .where(eq(domains.id, input.domainId))
      .limit(1);

    if (!domain) {
      throw new Error("Invalid domain selected");
    }

    const resolvedCollegeIds = await resolveColleges(
      tx,
      input.members
    );

    await tx
      .update(teams)
      .set({
        teamName: input.teamName.trim(),
        domainId: input.domainId,
        declarationAccepted: true,
        declarationAcceptedAt: new Date().toISOString(),
      })
      .where(eq(teams.id, team.id));

    // Load existing members so we can preserve verification data
    const existingMembers = await tx
      .select({
        id: teamMembers.id,
        email: teamMembers.email,
        emailVerifiedAt: teamMembers.emailVerifiedAt,
        emailVerificationTokenHash: teamMembers.emailVerificationTokenHash,
        emailVerificationExpiresAt: teamMembers.emailVerificationExpiresAt,
      })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, team.id));

    const existingByEmail = new Map(
      existingMembers.map((member) => [member.email, member])
    );

    const incomingEmails = input.members.map((member) =>
      member.email.toLowerCase()
    );

    // Remove members that were deleted from the form
    const emailsToRemove = existingMembers.filter(
      (member) => !incomingEmails.includes(member.email)
    );

    for (const member of emailsToRemove) {
      await tx
        .delete(teamMembers)
        .where(eq(teamMembers.id, member.id));
    }

    for (const member of input.members) {
      const normalizedEmail = member.email.toLowerCase();
      const existing = existingByEmail.get(normalizedEmail);

      if (existing) {
        await tx
          .update(teamMembers)
          .set({
            role: member.role,
            fullName: member.fullName.trim(),
            mobileNumber: member.mobileNumber.trim(),
            collegeId: resolvedCollegeIds.get(normalizedEmail)!,
            region: member.region.trim(),
            branch: member.branch.trim(),
            yearOfStudy: member.yearOfStudy,
          })
          .where(eq(teamMembers.id, existing.id));
      } else {
        await tx.insert(teamMembers).values({
          teamId: team.id,
          role: member.role,
          fullName: member.fullName.trim(),
          email: normalizedEmail,
          mobileNumber: member.mobileNumber.trim(),
          collegeId: resolvedCollegeIds.get(normalizedEmail)!,
          region: member.region.trim(),
          branch: member.branch.trim(),
          yearOfStudy: member.yearOfStudy,
        });
      }
    }

    const updatedMembers = await tx
      .select({
        name: teamMembers.fullName,
        email: teamMembers.email,
        emailVerified: teamMembers.emailVerifiedAt,
      })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, team.id));

    return {
      teamId: team.teamId,
      teamName: input.teamName.trim(),
      status: "DRAFT",
      members: updatedMembers.map((member) => ({
        name: member.name,
        email: member.email,
        emailVerified: Boolean(member.emailVerified),
      })),
    };
  });
};
