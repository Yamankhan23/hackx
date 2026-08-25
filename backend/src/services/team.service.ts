import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import crypto from "crypto";
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
  isTokenFreshlyMinted,
} from "../lib/verification-token";
import {
  REGISTRATION_FEE_RUPEES,
  RESUME_TOKEN_REUSE_WINDOW_MS,
  VERIFICATION_EXPIRY_HOURS,
} from "../lib/constants";
import { logger } from "../lib/logger";

import { enqueueEmailJob } from "./email-queue.service";

// Short random suffix for temporary IDs (team_id/payment_id/college_id
// columns before they're overwritten with their readable DB-id-derived
// form). Date.now() alone has only millisecond resolution — under a launch
// spike, two concurrent inserts landing in the same millisecond would
// collide on the unique constraint and fail a legitimate request.
const randomSuffix = () => crypto.randomInt(100000, 999999);
// colleges.college_id is VARCHAR(20) — too short for the 6-digit suffix above.
const shortRandomSuffix = () => crypto.randomInt(1000, 9999);

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
        .where(
          and(
            eq(colleges.collegeId, college.collegeId),
            eq(colleges.isActive, true)
          )
        )
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
          collegeId: `T-${Date.now()}-${shortRandomSuffix()}`,
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
      .where(and(eq(domains.id, input.domainId), eq(domains.isActive, true)))
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
    const temporaryTeamId = `TEMP-${Date.now()}-${randomSuffix()}`;

    const [team] = await tx
      .insert(teams)
      .values({
        teamId: temporaryTeamId,
        teamName: input.teamName.trim(),
        domainId: input.domainId,
        // Round 1 has no per-member email-verification or payment gate, but
        // the team leader must still confirm via the emailed link before
        // the team counts as CONFIRMED.
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

    const insertedMembers = await tx
      .insert(teamMembers)
      .values(
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
      )
      .returning({
        id: teamMembers.id,
        role: teamMembers.role,
        email: teamMembers.email,
        fullName: teamMembers.fullName,
      });

    const leaderMember = insertedMembers.find(
      (member) => member.role === "LEADER"
    )!;

    // ---------------------------------------------------------
    // 6. Return clean response
    // ---------------------------------------------------------

    return {
      teamId,
      registrationId,
      teamName: team.teamName,
      status: team.status,
      leaderMember,

      members: input.members.map((member) => ({
        name: member.fullName,
        email: member.email,
        emailVerified: false,
      })),
    };
  });

  // Mint a token for the leader and email ONLY the leader — done after the
  // transaction has committed so an email-provider hiccup can't roll back
  // an otherwise-successful registration. The same token both confirms the
  // registration (via /confirm) and grants edit access (via /resume), so no
  // other team member ever needs an email of their own.
  const resumeToken = generateVerificationToken();
  const resumeTokenHash = hashVerificationToken(resumeToken);
  const expiresAt = new Date(
    Date.now() + VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { leaderMember, ...response } = result;

  const mintToken = () =>
    db
      .update(teamMembers)
      .set({
        emailVerificationTokenHash: resumeTokenHash,
        emailVerificationExpiresAt: expiresAt,
      })
      .where(eq(teamMembers.id, leaderMember.id));

  try {
    try {
      await mintToken();
    } catch (firstError) {
      // One immediate retry — this UPDATE is the one step of registration
      // that isn't covered by the transaction, so a single transient
      // connection blip shouldn't be enough to strand an otherwise-committed
      // team with no way to reach it.
      logger.warn(
        { err: firstError, teamId: response.teamId },
        "Retrying confirmation token mint after registration commit"
      );
      await mintToken();
    }

    await enqueueEmailJob({
      emailType: "confirm_registration",
      recipient: leaderMember.email,
      dedupeKey: `confirm_registration:${resumeTokenHash}`,
      payload: {
        email: leaderMember.email,
        name: leaderMember.fullName,
        teamName: result.teamName,
        confirmToken: resumeToken,
      },
    });
  } catch (error) {
    // The team + members are already committed at this point — a failure
    // here must NOT surface as a registration failure (the caller would
    // retry and collide on the unique email/team-name constraints for a
    // team that already exists). Report success but without a usable
    // token: the leader can still recover it via the "continue
    // application" (resend-by-email) flow, which mints a fresh one
    // independently of this one having failed.
    logger.error(
      { err: error, teamId: response.teamId },
      "Failed to mint confirmation token / enqueue email after registration commit"
    );

    return { ...response, resumeToken: null };
  }

  return { ...response, resumeToken };
};

// Leader clicks the emailed confirm link — the only thing that moves a team
// from DRAFT to CONFIRMED now that Round 1 has no per-member verification or
// payment gate.
export const confirmRegistration = async (token: string) => {
  const tokenHash = hashVerificationToken(token);

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
      registrationId: teams.registrationId,
      teamName: teams.teamName,
      status: teams.status,
    })
    .from(teams)
    .where(eq(teams.id, leader.teamId))
    .limit(1);

  if (!team) {
    throw new Error("Team not found");
  }

  if (team.status === "CONFIRMED") {
    // Idempotent repeat hit (e.g. an email client's link-safety scanner
    // pre-fetching the link) — resolve as success instead of erroring on
    // the user's real click.
    return { team, alreadyConfirmed: true };
  }

  if (team.status !== "DRAFT") {
    throw new Error("This registration can no longer be confirmed.");
  }

  const [confirmed] = await db
    .update(teams)
    .set({ status: "CONFIRMED" })
    .where(and(eq(teams.id, team.id), eq(teams.status, "DRAFT")))
    .returning({
      teamId: teams.teamId,
      registrationId: teams.registrationId,
      teamName: teams.teamName,
      status: teams.status,
    });

  if (!confirmed) {
    // The status changed (e.g. an admin cancelled the team) between our read
    // above and this guarded update — do not report success for a
    // transition that didn't actually happen.
    throw new Error("This registration can no longer be confirmed.");
  }

  return { team: confirmed, alreadyConfirmed: false };
};

// Admin bulk action: advance a batch of Round-1-confirmed teams to Round 2.
// Reuses the existing PENDING_PAYMENT -> Razorpay -> CONFIRMED flow — the
// difference is only in who triggers it and what the leader is told. Each
// team is handled independently so one bad email address or a team that's
// no longer CONFIRMED doesn't stop the rest of a 50+ team batch.
export const selectTeamsForRound2 = async (teamIds: number[]) => {
  const rows = await db
    .select({
      id: teams.id,
      teamId: teams.teamId,
      teamName: teams.teamName,
      status: teams.status,
    })
    .from(teams)
    .where(inArray(teams.id, teamIds));

  const rowsById = new Map(rows.map((row) => [row.id, row]));

  const selected: { teamId: string; teamName: string }[] = [];
  const skipped: { teamId: number | string; teamName?: string; reason: string }[] = [];
  const failed: { teamId: string; teamName: string; reason: string }[] = [];

  for (const id of teamIds) {
    const team = rowsById.get(id);

    if (!team) {
      skipped.push({ teamId: id, reason: "Team not found" });
      continue;
    }

    if (team.status !== "CONFIRMED") {
      skipped.push({
        teamId: team.teamId,
        teamName: team.teamName,
        reason: `Status is ${team.status}, not CONFIRMED`,
      });
      continue;
    }

    try {
      const [leader] = await db
        .select({
          id: teamMembers.id,
          email: teamMembers.email,
          fullName: teamMembers.fullName,
        })
        .from(teamMembers)
        .where(and(eq(teamMembers.teamId, team.id), eq(teamMembers.role, "LEADER")))
        .limit(1);

      if (!leader) {
        failed.push({ teamId: team.teamId, teamName: team.teamName, reason: "Leader not found" });
        continue;
      }

      // Guarded by `status = 'CONFIRMED'` so a concurrent change (e.g. an
      // admin cancelling the team in another tab) doesn't get clobbered.
      const [transitioned] = await db
        .update(teams)
        .set({ status: "PENDING_PAYMENT" })
        .where(and(eq(teams.id, team.id), eq(teams.status, "CONFIRMED")))
        .returning({ id: teams.id });

      if (!transitioned) {
        failed.push({
          teamId: team.teamId,
          teamName: team.teamName,
          reason: "Status changed before it could be updated",
        });
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
        .where(eq(teamMembers.id, leader.id));

      await enqueueEmailJob({
        emailType: "round2_selection",
        recipient: leader.email,
        dedupeKey: `round2_selection:${tokenHash}`,
        payload: {
          email: leader.email,
          name: leader.fullName,
          teamName: team.teamName,
          amount: REGISTRATION_FEE_RUPEES,
          paymentToken: token,
        },
      });

      selected.push({ teamId: team.teamId, teamName: team.teamName });
    } catch (error) {
      logger.error({ err: error }, `Failed to select team ${team.teamId} for Round 2`);
      failed.push({
        teamId: team.teamId,
        teamName: team.teamName,
        reason: "Unexpected error — check server logs",
      });
    }
  }

  return { selected, skipped, failed };
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
          await enqueueEmailJob({
            emailType: "payment_link",
            recipient: leader.email,
            dedupeKey: `payment_link:${leaderTokenHash}`,
            payload: {
              email: leader.email,
              name: leader.fullName,
              teamName: transitioned.teamName,
              amount: REGISTRATION_FEE_RUPEES,
              paymentToken: leaderToken,
            },
          });
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

    await enqueueEmailJob({
      emailType: "verification",
      recipient: member.email,
      dedupeKey: `verification:${tokenHash}`,
      payload: {
        email: member.email,
        name: member.fullName,
        verificationToken: token,
      },
    });
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

  await enqueueEmailJob({
    emailType: "verification",
    recipient: member.email,
    dedupeKey: `verification:${tokenHash}`,
    payload: {
      email: member.email,
      name: member.fullName,
      verificationToken: token,
    },
  });

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

  // Leaders can always get back to a draft (to keep editing), a
  // pending-payment team (to pay), or a confirmed team (to edit details).
  // Anything else has no further action.
  if (
    !team ||
    (team.status !== "DRAFT" &&
      team.status !== "PENDING_PAYMENT" &&
      team.status !== "CONFIRMED")
  ) {
    return genericResult;
  }

  // Mint (or reuse) a token for the leader row, and decide whether to send.
  // Wrapped in a per-leader advisory lock so two near-simultaneous requests
  // (double-click, a client retry) can't each mint a different token —
  // without this, only the last write would stay valid and the other
  // request's email would carry a dead link.
  const minted = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${leader.id})`);

    const [current] = await tx
      .select({
        emailVerificationExpiresAt: teamMembers.emailVerificationExpiresAt,
      })
      .from(teamMembers)
      .where(eq(teamMembers.id, leader.id))
      .limit(1);

    if (
      isTokenFreshlyMinted(
        current?.emailVerificationExpiresAt,
        VERIFICATION_EXPIRY_HOURS,
        RESUME_TOKEN_REUSE_WINDOW_MS
      )
    ) {
      // A near-simultaneous request already minted a live token and is (or
      // just did) send its email — skip minting a second one. We don't have
      // that token's plaintext (only its hash is stored), so there's
      // nothing new to send either; the earlier request's email covers it.
      return null;
    }

    const token = generateVerificationToken();
    const tokenHash = hashVerificationToken(token);
    const expiresAt = new Date(
      Date.now() + VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000
    ).toISOString();

    await tx
      .update(teamMembers)
      .set({
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiresAt: expiresAt,
      })
      .where(eq(teamMembers.id, leader.id));

    return { token, tokenHash };
  });

  if (!minted) {
    return genericResult;
  }

  if (team.status === "CONFIRMED") {
    await enqueueEmailJob({
      emailType: "registration_confirmed",
      recipient: leader.email,
      dedupeKey: `registration_confirmed:${minted.tokenHash}`,
      payload: {
        email: leader.email,
        name: leader.fullName,
        teamName: team.teamName,
        resumeToken: minted.token,
      },
    });
  } else if (team.status === "DRAFT") {
    await enqueueEmailJob({
      emailType: "confirm_registration",
      recipient: leader.email,
      dedupeKey: `confirm_registration:${minted.tokenHash}`,
      payload: {
        email: leader.email,
        name: leader.fullName,
        teamName: team.teamName,
        confirmToken: minted.token,
      },
    });
  } else {
    // Only PENDING_PAYMENT remains at this point, and that status is now
    // exclusively reached via the admin's "select for Round 2" action — so
    // a leader resending their link here is asking for that same email again.
    await enqueueEmailJob({
      emailType: "round2_selection",
      recipient: leader.email,
      dedupeKey: `round2_selection:${minted.tokenHash}`,
      payload: {
        email: leader.email,
        name: leader.fullName,
        teamName: team.teamName,
        amount: REGISTRATION_FEE_RUPEES,
        paymentToken: minted.token,
      },
    });
  }

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

  // The leader may verify via this resume link instead of their own
  // verification email — if they were the last unverified member, the
  // DRAFT -> PENDING_PAYMENT transition normally driven by verifyEmail()
  // needs to happen here too, or the team is stuck in DRAFT forever with
  // no payment link ever generated. Checked unconditionally (not only when
  // we just set emailVerifiedAt above) so a retry after a partial failure
  // — the mark-verified UPDATE above succeeded but this transition didn't —
  // still attempts the transition instead of silently skipping it forever.
  if (team.status === "DRAFT") {
    const stillUnverified = await db
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, team.id), isNull(teamMembers.emailVerifiedAt)));

    if (stillUnverified.length === 0) {
      const [transitioned] = await db
        .update(teams)
        .set({ status: "PENDING_PAYMENT" })
        .where(and(eq(teams.id, team.id), eq(teams.status, "DRAFT")))
        .returning({ id: teams.id });

      if (transitioned) {
        team.status = "PENDING_PAYMENT";
      }
    }
  }

  // If the team is no longer a draft (and isn't a confirmed team, which
  // remains editable via this same link), branch by status instead of a
  // single generic "already submitted" message.
  if (team.status !== "DRAFT" && team.status !== "CONFIRMED") {
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
      email: teamMembers.email,
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

  if (team.status !== "DRAFT" && team.status !== "CONFIRMED") {
    throw new Error(
      "This application has already been submitted and can no longer be edited."
    );
  }

  // The authenticating leader's own row must stay present, stay LEADER, and
  // keep the same email — any of those changing would delete or invalidate
  // their token (the only credential for this team), leaving no one able to
  // resume/pay/edit afterwards. Leadership/email transfer isn't a supported
  // feature; it must go through admin instead.
  const leaderInPayload = input.members.find(
    (member) => member.id === leader.id
  );

  if (!leaderInPayload || leaderInPayload.role !== "LEADER") {
    throw new Error(
      "The team leader cannot be removed or reassigned here. Contact admin to transfer leadership."
    );
  }

  if (leaderInPayload.email.toLowerCase() !== leader.email.toLowerCase()) {
    throw new Error(
      "The team leader's email cannot be changed here. Contact admin if it needs to change."
    );
  }

  await db.transaction(async (tx) => {
    const [domain] = await tx
      .select({ id: domains.id })
      .from(domains)
      .where(and(eq(domains.id, input.domainId), eq(domains.isActive, true)))
      .limit(1);

    if (!domain) {
      throw new Error("Invalid domain selected");
    }

    const resolvedCollegeIds = await resolveColleges(
      tx,
      input.members
    );

    // Re-check status inside the same transaction as the write: the read
    // above can be stale by the time this runs (e.g. an admin's Round-2
    // selection flips the team to PENDING_PAYMENT in between), and without
    // this guard the edit below would go through anyway.
    const [statusStillEditable] = await tx
      .update(teams)
      .set({
        teamName: input.teamName.trim(),
        domainId: input.domainId,
        declarationAccepted: true,
        declarationAcceptedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(teams.id, team.id),
          inArray(teams.status, ["DRAFT", "CONFIRMED"])
        )
      )
      .returning({ id: teams.id });

    if (!statusStillEditable) {
      throw new Error(
        "This application has already been submitted and can no longer be edited."
      );
    }

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

  // Round 1 has no per-member verification, so editing a draft/confirmed
  // team never emails anyone but the leader (and only via the explicit
  // confirm/resume flows above) — non-leader members get no email at all.

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
    status: team.status,
    members: updatedMembers.map((member) => ({
      name: member.name,
      email: member.email,
      emailVerified: Boolean(member.emailVerified),
    })),
  };
};
