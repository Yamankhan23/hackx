import { and, eq, inArray, isNull } from "drizzle-orm";
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
import { REGISTRATION_FEE_RUPEES, VERIFICATION_EXPIRY_HOURS } from "../lib/constants";

import {
  sendApplicationResumeEmail,
  sendPaymentLinkEmail,
  sendVerificationEmail,
} from "./email.service";

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

      // Atomic upsert: avoids the race where two concurrent registrations
      // for the same brand-new college both pass a "not found" check and
      // then both try to insert, tripping the unique constraint on name.
      const [insertedCollege] = await tx
        .insert(colleges)
        .values({
          // Short temporary ID because colleges.college_id is VARCHAR(20)
          collegeId: `T-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: normalizedCollegeName,
          region: member.region,
        })
        .onConflictDoNothing({ target: colleges.name })
        .returning({ id: colleges.id });

      let collegeRowId: number;

      if (insertedCollege) {
        collegeRowId = Number(insertedCollege.id);

        // Generate final readable ID from database-generated ID
        const readableCollegeId = `COL-${String(collegeRowId).padStart(3, "0")}`;

        await tx
          .update(colleges)
          .set({ collegeId: readableCollegeId })
          .where(eq(colleges.id, collegeRowId));
      } else {
        const [existingCollege] = await tx
          .select({ id: colleges.id })
          .from(colleges)
          .where(eq(colleges.name, normalizedCollegeName))
          .limit(1);

        if (!existingCollege) {
          throw new Error(
            `Failed to resolve college "${normalizedCollegeName}"`
          );
        }

        collegeRowId = Number(existingCollege.id);
      }

      resolvedCollegeIds.set(member.email, collegeRowId);
    }
  }

  return resolvedCollegeIds;
};

export const registerTeam = async (input: RegisterTeamInput) => {
  const normalizedEmails = input.members.map((member) =>
    member.email.toLowerCase()
  );

  const result = await db.transaction(async (tx) => {
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

  // Send verification emails only after the transaction has committed —
  // an email-provider hiccup must not roll back an otherwise-successful
  // registration.
  try {
    await sendTeamVerificationEmails(result.teamId);
  } catch (error) {
    console.error(
      "Failed to send verification emails after registration:",
      error
    );
  }

  return result;
};

export const verifyEmail = async (token: string) => {
  const tokenHash = hashVerificationToken(token);

  const [member] = await db
    .select({
      id: teamMembers.id,
      email: teamMembers.email,
      fullName: teamMembers.fullName,
      role: teamMembers.role,
      teamId: teamMembers.teamId,
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
    // Idempotent repeat hit — most commonly an email client's link-safety
    // scanner (Gmail/Outlook/etc. pre-fetch links before the user clicks)
    // already consumed this token. Since we no longer clear the token hash
    // on success (see below), this branch resolves such repeats as success
    // instead of a confusing INVALID_TOKEN error on the user's real click.
    const membersOfTeam = await db
      .select({ emailVerifiedAt: teamMembers.emailVerifiedAt })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, member.teamId));

    return {
      email: member.email,
      name: member.fullName,
      isLeader: member.role === "LEADER",
      allVerified: membersOfTeam.every((m) => m.emailVerifiedAt !== null),
      alreadyVerified: true,
    };
  }

  if (
    !member.emailVerificationExpiresAt ||
    new Date(member.emailVerificationExpiresAt) < new Date()
  ) {
    throw new Error("TOKEN_EXPIRED");
  }

  // Intentionally NOT clearing emailVerificationTokenHash/ExpiresAt here —
  // leaving the token valid (until its normal 24h expiry) means a duplicate
  // hit on the same token is handled by the emailVerifiedAt branch above
  // instead of erroring.
  await db
    .update(teamMembers)
    .set({ emailVerifiedAt: new Date().toISOString() })
    .where(eq(teamMembers.id, member.id));

  const stillUnverified = await db
    .select({ id: teamMembers.id })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.teamId, member.teamId),
        isNull(teamMembers.emailVerifiedAt)
      )
    );

  const allVerified = stillUnverified.length === 0;
  const isLeader = member.role === "LEADER";
  let paymentToken: string | undefined;

  if (allVerified) {
    // Guarded by `status = 'DRAFT'` so only one concurrent request (the
    // one that verifies the last member) performs the transition and the
    // one-time payment-link dispatch.
    const [transitioned] = await db
      .update(teams)
      .set({ status: "PENDING_PAYMENT" })
      .where(
        and(eq(teams.id, member.teamId), eq(teams.status, "DRAFT"))
      )
      .returning({ id: teams.id, teamName: teams.teamName });

    if (transitioned) {
      const [leader] = await db
        .select({
          id: teamMembers.id,
          email: teamMembers.email,
          fullName: teamMembers.fullName,
        })
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, member.teamId),
            eq(teamMembers.role, "LEADER")
          )
        )
        .limit(1);

      if (leader) {
        const leaderToken = generateVerificationToken();
        const leaderTokenHash = hashVerificationToken(leaderToken);
        const expiresAt = new Date(
          Date.now() + VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000
        ).toISOString();

        await db
          .update(teamMembers)
          .set({
            emailVerificationTokenHash: leaderTokenHash,
            emailVerificationExpiresAt: expiresAt,
          })
          .where(eq(teamMembers.id, leader.id));

        if (leader.id === member.id) {
          paymentToken = leaderToken;
        } else {
          try {
            await sendPaymentLinkEmail({
              email: leader.email,
              name: leader.fullName,
              teamName: transitioned.teamName,
              amount: REGISTRATION_FEE_RUPEES,
              paymentToken: leaderToken,
            });
          } catch (error) {
            console.error("Failed to send payment link email:", error);
          }
        }
      }
    }
  }

  return {
    email: member.email,
    name: member.fullName,
    isLeader,
    allVerified,
    alreadyVerified: false,
    ...(paymentToken ? { paymentToken } : {}),
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

    // Don't re-send if the member already has a live, unexpired token —
    // avoids re-emailing everyone on every draft save.
    const hasActiveToken =
      member.emailVerificationTokenHash &&
      member.emailVerificationExpiresAt &&
      new Date(member.emailVerificationExpiresAt).getTime() > Date.now();

    if (hasActiveToken) {
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

    try {
      await sendVerificationEmail({
        email: member.email,
        name: member.fullName,
        verificationToken: token,
      });
    } catch (error) {
      // One bad address shouldn't block verification emails to the rest
      // of the team.
      console.error(
        `Failed to send verification email to ${member.email}:`,
        error
      );
    }
  }

  return {
    teamId: team.teamId,
    message: "Verification emails sent successfully",
  };
};

// Public, enumeration-safe resend: looks up by the member's own email
// (any role, not just the leader) rather than a guessable team ID.
export const resendVerificationEmail = async (email: string) => {
  const genericResult = {
    message:
      "If this email belongs to an unverified team member, a verification link has been sent.",
  };

  const normalizedEmail = email.toLowerCase();

  const [member] = await db
    .select({
      id: teamMembers.id,
      email: teamMembers.email,
      fullName: teamMembers.fullName,
      emailVerifiedAt: teamMembers.emailVerifiedAt,
    })
    .from(teamMembers)
    .where(eq(teamMembers.email, normalizedEmail))
    .limit(1);

  if (!member || member.emailVerifiedAt) {
    return genericResult;
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

  try {
    await sendVerificationEmail({
      email: member.email,
      name: member.fullName,
      verificationToken: token,
    });
  } catch (error) {
    console.error("Failed to resend verification email:", error);
  }

  return genericResult;
};

// ---------------------------------------------------------
// Continue your application (resume draft / pay)
// ---------------------------------------------------------

export const sendResumeLink = async (leaderEmail: string) => {
  const normalizedEmail = leaderEmail.toLowerCase();
  const genericResult = {
    message:
      "If this email has a pending application, a link has been sent.",
  };

  // Find the leader of a team by email
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
    return genericResult;
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

  // Leaders can always get back to a draft (to keep editing) or a
  // pending-payment team (to pay). Anything else has no further action.
  if (!team || (team.status !== "DRAFT" && team.status !== "PENDING_PAYMENT")) {
    return genericResult;
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

  return genericResult;
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
    .where(
      and(
        eq(teamMembers.emailVerificationTokenHash, tokenHash),
        eq(teamMembers.role, "LEADER")
      )
    )
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

  // If the team is no longer a draft, branch by status instead of a single
  // generic "already submitted" message.
  if (team.status !== "DRAFT") {
    if (team.status === "PENDING_PAYMENT") {
      return {
        alreadySubmitted: true,
        status: team.status,
        message: "Please complete payment to confirm your team's registration.",
        team: {
          teamId: team.teamId,
          registrationId: team.registrationId,
          teamName: team.teamName,
          status: team.status,
        },
        payment: { amountRupees: REGISTRATION_FEE_RUPEES },
      };
    }

    if (team.status === "CANCELLED") {
      return {
        alreadySubmitted: true,
        status: team.status,
        message:
          "This registration has been cancelled. Contact the organizers if you believe this is a mistake.",
        team: {
          teamId: team.teamId,
          registrationId: team.registrationId,
          teamName: team.teamName,
          status: team.status,
        },
      };
    }

    return {
      alreadySubmitted: true,
      status: team.status,
      message: "Your details are already recorded. Contact admin for any query.",
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
  resumeToken: string,
  input: UpdateTeamInput
) => {
  const tokenHash = hashVerificationToken(resumeToken);

  const [leader] = await db
    .select({
      id: teamMembers.id,
      teamId: teamMembers.teamId,
      emailVerificationExpiresAt: teamMembers.emailVerificationExpiresAt,
    })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.emailVerificationTokenHash, tokenHash),
        eq(teamMembers.role, "LEADER")
      )
    )
    .limit(1);

  if (!leader) {
    throw new Error("INVALID_TOKEN");
  }

  if (
    leader.emailVerificationExpiresAt &&
    new Date(leader.emailVerificationExpiresAt).getTime() < Date.now()
  ) {
    throw new Error("TOKEN_EXPIRED");
  }

  const [team] = await db
    .select({
      id: teams.id,
      teamId: teams.teamId,
      status: teams.status,
    })
    .from(teams)
    .where(eq(teams.id, leader.teamId))
    .limit(1);

  if (!team) {
    throw new Error("Team not found");
  }

  if (team.status !== "DRAFT") {
    throw new Error(
      "This application has already been submitted and can no longer be edited."
    );
  }

  await db.transaction(async (tx) => {
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

    // Load existing members so we can match by id (stable across email
    // edits) rather than by email (breaks if a member — especially the
    // leader whose row the resume token points at — changes their own
    // email, and mishandles two members swapping emails).
    const existingMembers = await tx
      .select({
        id: teamMembers.id,
        email: teamMembers.email,
      })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, team.id));

    const existingById = new Map(
      existingMembers.map((member) => [member.id, member])
    );

    const incomingIds = new Set(
      input.members
        .map((member) => member.id)
        .filter((id): id is number => typeof id === "number")
    );

    // Remove members that were deleted from the form
    const membersToRemove = existingMembers.filter(
      (member) => !incomingIds.has(member.id)
    );

    for (const member of membersToRemove) {
      await tx
        .delete(teamMembers)
        .where(eq(teamMembers.id, member.id));
    }

    for (const member of input.members) {
      const normalizedEmail = member.email.toLowerCase();
      const existing =
        typeof member.id === "number"
          ? existingById.get(member.id)
          : undefined;

      if (existing) {
        const emailChanged = existing.email !== normalizedEmail;

        await tx
          .update(teamMembers)
          .set({
            role: member.role,
            fullName: member.fullName.trim(),
            email: normalizedEmail,
            mobileNumber: member.mobileNumber.trim(),
            collegeId: resolvedCollegeIds.get(normalizedEmail)!,
            region: member.region.trim(),
            branch: member.branch.trim(),
            yearOfStudy: member.yearOfStudy,
            // Changing your email means re-verifying it.
            ...(emailChanged
              ? {
                  emailVerifiedAt: null,
                  emailVerificationTokenHash: null,
                  emailVerificationExpiresAt: null,
                }
              : {}),
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
  });

  // Re-send verification to any member left unverified without an active
  // token (newly added members, or members whose email just changed).
  try {
    await sendTeamVerificationEmails(team.teamId);
  } catch (error) {
    console.error(
      "Failed to send verification emails after draft update:",
      error
    );
  }

  const updatedMembers = await db
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
};
