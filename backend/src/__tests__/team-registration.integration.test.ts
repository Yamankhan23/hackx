import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "crypto";
import { eq, inArray, like } from "drizzle-orm";
import { db, pool } from "../db";
import { colleges, domains, emailJobs, teamMembers, teams } from "../db/migrations/schema";
import {
  confirmRegistration,
  registerTeam,
  resumeApplication,
  updateTeam,
} from "../services/team.service";
import type { RegisterTeamInput, UpdateTeamInput } from "../validators/team.validator";

// This suite talks to the REAL Postgres configured via DATABASE_URL (see
// backend/.env) instead of mocking the DB layer — the R1-R7 fixes it
// exercises are about actual unique-constraint/FK/race behavior that a
// mocked db would just assume away. Every row it creates is tagged with a
// per-run id and hard-deleted in afterAll; any reference row it briefly
// flips (isActive) is restored. The final assertion in afterAll confirms
// zero rows from this run survive.
//
// Requires at least one active domain and one active college to already
// exist (true on any environment that's had normal admin setup done).

// Each test does several real round trips to the Supabase pooler over the
// network — the 5s default is too tight for that, not a sign of a hang.
vi.setConfig({ testTimeout: 20_000 });

const RUN_ID = randomUUID().slice(0, 8);
const testEmail = (label: string) => `e2e-${RUN_ID}-${label}@test.invalid`;

const createdTeamIds: number[] = [];
const isActiveRestores: Array<{
  table: "domains" | "colleges";
  id: number;
  value: boolean;
}> = [];

let activeDomainId: number;
let activeCollegeId: string;

const buildMembers = (leaderEmail: string, labelSuffix: string) => [
  {
    role: "LEADER" as const,
    fullName: "E2E Leader",
    email: leaderEmail,
    mobileNumber: "9876543210",
    college: { collegeId: activeCollegeId },
    region: "Test Region",
    branch: "Computer Science",
    yearOfStudy: 2,
  },
  {
    role: "MEMBER" as const,
    fullName: "E2E Member One",
    email: testEmail(`member1-${labelSuffix}`),
    mobileNumber: "9876543211",
    college: { collegeId: activeCollegeId },
    region: "Test Region",
    branch: "Computer Science",
    yearOfStudy: 2,
  },
  {
    role: "MEMBER" as const,
    fullName: "E2E Member Two",
    email: testEmail(`member2-${labelSuffix}`),
    mobileNumber: "9876543212",
    college: { collegeId: activeCollegeId },
    region: "Test Region",
    branch: "Computer Science",
    yearOfStudy: 2,
  },
];

// Registers + confirms a fresh team, returning enough to drive further
// service calls against it. Tracks the row for cleanup.
const createConfirmedTeam = async (labelSuffix: string) => {
  const input: RegisterTeamInput = {
    teamName: `E2E Test Team ${RUN_ID} ${labelSuffix}`,
    domainId: activeDomainId,
    declarationAccepted: true,
    members: buildMembers(testEmail(`leader-${labelSuffix}`), labelSuffix),
  };

  const result = await registerTeam(input);
  expect(result.resumeToken).toBeTruthy();

  const [row] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.teamId, result.teamId));
  const numericTeamId = Number(row.id);
  createdTeamIds.push(numericTeamId);

  const confirmed = await confirmRegistration(result.resumeToken as string);
  expect(confirmed.alreadyConfirmed).toBe(false);
  expect(confirmed.team.status).toBe("CONFIRMED");

  const members = await db
    .select({
      id: teamMembers.id,
      role: teamMembers.role,
      email: teamMembers.email,
      fullName: teamMembers.fullName,
    })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, numericTeamId));

  return {
    resumeToken: result.resumeToken as string,
    numericTeamId,
    teamName: input.teamName,
    members,
  };
};

const toUpdatePayload = (
  teamName: string,
  members: Array<{ id: number; role: "LEADER" | "MEMBER"; email: string; fullName: string }>,
  overrides?: Partial<Record<number, Partial<UpdateTeamInput["members"][number]>>>
): UpdateTeamInput => ({
  teamName,
  domainId: activeDomainId,
  declarationAccepted: true,
  members: members.map((member) => ({
    id: member.id,
    role: member.role,
    fullName: member.fullName,
    email: member.email,
    mobileNumber: "9876543210",
    college: { collegeId: activeCollegeId },
    region: "Test Region",
    branch: "Computer Science",
    yearOfStudy: 2,
    ...(overrides?.[member.id] ?? {}),
  })),
});

beforeAll(async () => {
  const [domain] = await db
    .select({ id: domains.id })
    .from(domains)
    .where(eq(domains.isActive, true))
    .limit(1);

  const [college] = await db
    .select({ id: colleges.id, collegeId: colleges.collegeId })
    .from(colleges)
    .where(eq(colleges.isActive, true))
    .limit(1);

  if (!domain || !college) {
    throw new Error(
      "This suite needs at least one active domain and one active college already in the DB."
    );
  }

  activeDomainId = Number(domain.id);
  activeCollegeId = college.collegeId;
});

afterAll(async () => {
  if (createdTeamIds.length > 0) {
    // team_members cascade-deletes with its team (ON DELETE CASCADE).
    await db.delete(teams).where(inArray(teams.id, createdTeamIds));
  }

  // email_jobs has no FK to teams, so registerTeam's confirmation-email
  // enqueue leaves a row here that the teams delete above can't cascade
  // away — clean it up explicitly by the fixed test-email domain.
  await db.delete(emailJobs).where(like(emailJobs.recipient, "%@test.invalid"));

  for (const restore of isActiveRestores) {
    if (restore.table === "domains") {
      await db.update(domains).set({ isActive: restore.value }).where(eq(domains.id, restore.id));
    } else {
      await db.update(colleges).set({ isActive: restore.value }).where(eq(colleges.id, restore.id));
    }
  }

  if (createdTeamIds.length > 0) {
    const leftover = await db
      .select({ id: teams.id })
      .from(teams)
      .where(inArray(teams.id, createdTeamIds));
    expect(leftover).toHaveLength(0);
  }

  const leftoverEmailJobs = await db
    .select({ id: emailJobs.id })
    .from(emailJobs)
    .where(like(emailJobs.recipient, "%@test.invalid"));
  expect(leftoverEmailJobs).toHaveLength(0);

  await pool.end();
});

describe("registration flow (real DB, self-cleaning)", () => {
  it("registers a team, mints a working token, and confirms it", async () => {
    const team = await createConfirmedTeam("happy-path");

    // Idempotent repeat hit (e.g. an email scanner pre-fetching the link).
    const repeat = await confirmRegistration(team.resumeToken);
    expect(repeat.alreadyConfirmed).toBe(true);
  });

  it("resumeApplication returns the draft view for a confirmed team", async () => {
    const team = await createConfirmedTeam("resume-view");

    const draft = await resumeApplication(team.resumeToken);
    expect(draft.alreadySubmitted).toBe(false);
    if (!draft.alreadySubmitted) {
      expect(draft.team.teamId).toBeTruthy();
      expect(draft.draft.teamName).toBe(team.teamName);
      expect(draft.draft.members).toHaveLength(3);
    }
  });

  it("updateTeam saves a normal edit", async () => {
    const team = await createConfirmedTeam("normal-edit");
    const newName = `${team.teamName} (edited)`;

    const result = await updateTeam(team.resumeToken, toUpdatePayload(newName, team.members));

    expect(result.teamName).toBe(newName);

    const [row] = await db
      .select({ teamName: teams.teamName })
      .from(teams)
      .where(eq(teams.id, team.numericTeamId));
    expect(row.teamName).toBe(newName);
  });

  it("rejects an edit that removes or demotes the authenticating leader (R5)", async () => {
    const team = await createConfirmedTeam("leader-removed");
    const leader = team.members.find((member) => member.role === "LEADER")!;

    // Drop the leader's row from the payload entirely, promote another
    // member to LEADER instead.
    const payload = toUpdatePayload(
      team.teamName,
      team.members.filter((member) => member.id !== leader.id),
      undefined
    );
    payload.members[0] = { ...payload.members[0], role: "LEADER" };

    await expect(updateTeam(team.resumeToken, payload)).rejects.toThrow(
      /leader cannot be removed or reassigned/i
    );

    // Confirm nothing was actually changed.
    const remaining = await db
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, team.numericTeamId));
    expect(remaining).toHaveLength(3);
  });

  it("rejects an edit that changes the authenticating leader's email (R7)", async () => {
    const team = await createConfirmedTeam("leader-email-change");
    const leader = team.members.find((member) => member.role === "LEADER")!;

    const payload = toUpdatePayload(team.teamName, team.members, {
      [leader.id]: { email: testEmail("leader-email-change-attempt") },
    });

    await expect(updateTeam(team.resumeToken, payload)).rejects.toThrow(
      /leader's email cannot be changed/i
    );

    const [row] = await db
      .select({ email: teamMembers.email })
      .from(teamMembers)
      .where(eq(teamMembers.id, leader.id));
    expect(row.email).toBe(leader.email);
  });

  it("rejects an edit once the team is no longer DRAFT/CONFIRMED (R4)", async () => {
    const team = await createConfirmedTeam("locked-status");

    // Simulate what selectTeamsForRound2 does to a confirmed team.
    await db.update(teams).set({ status: "PENDING_PAYMENT" }).where(eq(teams.id, team.numericTeamId));

    await expect(
      updateTeam(team.resumeToken, toUpdatePayload(team.teamName, team.members))
    ).rejects.toThrow(/already been submitted/i);
  });

  it("rejects registration against a deactivated domain (R6)", async () => {
    await db.update(domains).set({ isActive: false }).where(eq(domains.id, activeDomainId));
    isActiveRestores.push({ table: "domains", id: activeDomainId, value: true });

    const input: RegisterTeamInput = {
      teamName: `E2E Test Team ${RUN_ID} inactive-domain`,
      domainId: activeDomainId,
      declarationAccepted: true,
      members: buildMembers(testEmail("leader-inactive-domain"), "inactive-domain"),
    };

    await expect(registerTeam(input)).rejects.toThrow(/invalid domain/i);

    await db.update(domains).set({ isActive: true }).where(eq(domains.id, activeDomainId));
  });

  it("rejects registration against a deactivated college (R6)", async () => {
    const [collegeRow] = await db
      .select({ id: colleges.id })
      .from(colleges)
      .where(eq(colleges.collegeId, activeCollegeId));

    await db.update(colleges).set({ isActive: false }).where(eq(colleges.id, collegeRow.id));
    isActiveRestores.push({ table: "colleges", id: Number(collegeRow.id), value: true });

    const input: RegisterTeamInput = {
      teamName: `E2E Test Team ${RUN_ID} inactive-college`,
      domainId: activeDomainId,
      declarationAccepted: true,
      members: buildMembers(testEmail("leader-inactive-college"), "inactive-college"),
    };

    await expect(registerTeam(input)).rejects.toThrow(/does not exist/i);

    await db.update(colleges).set({ isActive: true }).where(eq(colleges.id, collegeRow.id));
  });

  it("does not fabricate success when two confirmations race (R2, best-effort)", async () => {
    const input: RegisterTeamInput = {
      teamName: `E2E Test Team ${RUN_ID} confirm-race`,
      domainId: activeDomainId,
      declarationAccepted: true,
      members: buildMembers(testEmail("leader-confirm-race"), "confirm-race"),
    };

    const result = await registerTeam(input);
    const [row] = await db
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.teamId, result.teamId));
    createdTeamIds.push(Number(row.id));

    const token = result.resumeToken as string;

    const outcomes = await Promise.allSettled([
      confirmRegistration(token),
      confirmRegistration(token),
    ]);

    const successes = outcomes.filter(
      (outcome): outcome is PromiseFulfilledResult<Awaited<ReturnType<typeof confirmRegistration>>> =>
        outcome.status === "fulfilled"
    );

    // Whichever way the race resolves, every successful response must
    // reflect the DB's actual final state — never a fabricated CONFIRMED
    // for a transition that didn't happen.
    expect(successes.length).toBeGreaterThanOrEqual(1);

    const [finalRow] = await db
      .select({ status: teams.status })
      .from(teams)
      .where(eq(teams.id, Number(row.id)));

    for (const success of successes) {
      expect(success.value.team.status).toBe(finalRow.status);
    }
    expect(finalRow.status).toBe("CONFIRMED");
  });
});
