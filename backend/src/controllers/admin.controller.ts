import type { Request, Response } from "express";
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { db } from "../db";
import {
  admins,
  colleges,
  domains,
  payments,
  problemStatements,
  rounds,
  teamMembers,
  teams,
} from "../db/migrations/schema";
import {
  adminLoginSchema,
  createCollegeSchema,
  createDomainSchema,
  createProblemStatementSchema,
  createRoundSchema,
  paymentStatusValues,
  selectTeamsForRound2Schema,
  teamStatusValues,
  toggleActiveSchema,
  togglePublishedSchema,
  toggleRoundStatusSchema,
  updateCollegeSchema,
  updateDomainSchema,
  updateProblemStatementSchema,
  updateRoundSchema,
  updateTeamStatusSchema,
} from "../validators/admin.validator";
import { ADMIN_JWT_ALGORITHM } from "../lib/constants";
import { selectTeamsForRound2 as selectTeamsForRound2Service } from "../services/team.service";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const pagination = (req: Request) => {
  const page = Math.max(Number(req.query.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit ?? 10), 1), 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

export const adminLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = adminLoginSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid login data",
        errors: validation.error.issues,
      });
      return;
    }

    const { email, password } = validation.data;
    const [admin] = await db.select().from(admins).where(eq(admins.email, email)).limit(1);

    if (!admin || !admin.isActive) {
      res.status(401).json({ success: false, message: "Invalid email or password" });
      return;
    }

    const passwordValid = await bcrypt.compare(password, admin.passwordHash);
    if (!passwordValid) {
      res.status(401).json({ success: false, message: "Invalid email or password" });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      res.status(500).json({ success: false, message: "Server configuration error" });
      return;
    }

    const token = jwt.sign({ adminId: admin.id, role: admin.role }, jwtSecret, {
      expiresIn: "8h",
      algorithm: ADMIN_JWT_ALGORITHM,
    });

    await db.update(admins).set({ lastLoginAt: new Date().toISOString() }).where(eq(admins.id, admin.id));

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        admin: {
          id: admin.id,
          adminId: admin.adminId,
          name: admin.name,
          email: admin.email,
          role: admin.role,
        },
        token,
      },
    });
  } catch (error) {
    req.log.error({ err: error }, "Admin login error");
    res.status(500).json({ success: false, message: "Failed to login" });
  }
};

export const getDashboard = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalTeams,
      totalParticipants,
      verifiedParticipants,
      confirmedRegistrations,
      pendingPaymentRegistrations,
      draftRegistrations,
      cancelledRegistrations,
      totalPayments,
      successfulPayments,
      pendingPayments,
      failedPayments,
      totalCollected,
      domainBreakdown,
      recentRegistrations,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(teams),
      db.select({ count: sql<number>`count(*)::int` }).from(teamMembers),
      db.select({ count: sql<number>`count(*)::int` }).from(teamMembers).where(sql`${teamMembers.emailVerifiedAt} is not null`),
      db.select({ count: sql<number>`count(*)::int` }).from(teams).where(eq(teams.status, "CONFIRMED")),
      db.select({ count: sql<number>`count(*)::int` }).from(teams).where(eq(teams.status, "PENDING_PAYMENT")),
      db.select({ count: sql<number>`count(*)::int` }).from(teams).where(eq(teams.status, "DRAFT")),
      db.select({ count: sql<number>`count(*)::int` }).from(teams).where(eq(teams.status, "CANCELLED")),
      db.select({ count: sql<number>`count(*)::int` }).from(payments),
      db.select({ count: sql<number>`count(*)::int` }).from(payments).where(eq(payments.status, "SUCCESS")),
      db.select({ count: sql<number>`count(*)::int` }).from(payments).where(or(eq(payments.status, "CREATED"), eq(payments.status, "PENDING"))),
      db.select({ count: sql<number>`count(*)::int` }).from(payments).where(eq(payments.status, "FAILED")),
      db.select({ total: sql<number>`coalesce(sum(${payments.amount}), 0)::int` }).from(payments).where(eq(payments.status, "SUCCESS")),
      db
        .select({
          domainId: domains.id,
          domainName: domains.name,
          total: sql<number>`count(${teams.id})::int`,
        })
        .from(teams)
        .innerJoin(domains, eq(domains.id, teams.domainId))
        .groupBy(domains.id, domains.name)
        .orderBy(desc(sql`count(${teams.id})`)),
      db
        .select({
          id: teams.id,
          teamId: teams.teamId,
          registrationId: teams.registrationId,
          teamName: teams.teamName,
          status: teams.status,
          createdAt: teams.createdAt,
          domainName: domains.name,
        })
        .from(teams)
        .innerJoin(domains, eq(domains.id, teams.domainId))
        .orderBy(desc(teams.createdAt))
        .limit(10),
    ]);

    res.json({
      success: true,
      data: {
        totalTeams: totalTeams[0]?.count ?? 0,
        totalParticipants: totalParticipants[0]?.count ?? 0,
        verifiedParticipants: verifiedParticipants[0]?.count ?? 0,
        unverifiedParticipants: Math.max((totalParticipants[0]?.count ?? 0) - (verifiedParticipants[0]?.count ?? 0), 0),
        totalRegistrations: totalTeams[0]?.count ?? 0,
        confirmedRegistrations: confirmedRegistrations[0]?.count ?? 0,
        pendingPaymentRegistrations: pendingPaymentRegistrations[0]?.count ?? 0,
        draftRegistrations: draftRegistrations[0]?.count ?? 0,
        cancelledRegistrations: cancelledRegistrations[0]?.count ?? 0,
        totalPayments: totalPayments[0]?.count ?? 0,
        successfulPayments: successfulPayments[0]?.count ?? 0,
        pendingPayments: pendingPayments[0]?.count ?? 0,
        failedPayments: failedPayments[0]?.count ?? 0,
        totalCollected: totalCollected[0]?.total ?? 0,
        registrationsByDomain: domainBreakdown,
        recentRegistrations,
      },
    });
  } catch (error) {
    _req.log.error({ err: error }, "Dashboard error");
    res.status(500).json({ success: false, message: "Failed to load dashboard" });
  }
};

export const getTeams = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit, offset } = pagination(req);
    const search = String(req.query.search ?? "").trim();
    const status = String(req.query.status ?? "").trim();

    if (status && !teamStatusValues.includes(status as (typeof teamStatusValues)[number])) {
      res.status(400).json({ success: false, message: "Invalid status filter" });
      return;
    }

    const filters: SQL[] = [];
    if (status) filters.push(eq(teams.status, status as (typeof teamStatusValues)[number]));
    if (search) {
      filters.push(
        or(
          ilike(teams.teamId, `%${search}%`),
          ilike(teams.registrationId, `%${search}%`),
          ilike(teams.teamName, `%${search}%`),
          ilike(teamMembers.email, `%${search}%`)
        )!
      );
    }

    const whereClause = filters.length ? and(...filters) : undefined;
    const [rows, [{ count: total } = { count: 0 }]] = await Promise.all([
      db
        .select({
          id: teams.id,
          teamId: teams.teamId,
          registrationId: teams.registrationId,
          teamName: teams.teamName,
          status: teams.status,
          createdAt: teams.createdAt,
          domainName: domains.name,
          memberCount: sql<number>`count(${teamMembers.id})::int`,
        })
        .from(teams)
        .innerJoin(domains, eq(domains.id, teams.domainId))
        .leftJoin(teamMembers, eq(teamMembers.teamId, teams.id))
        .where(whereClause)
        .groupBy(teams.id, domains.name)
        .orderBy(desc(teams.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(distinct ${teams.id})::int` })
        .from(teams)
        .innerJoin(domains, eq(domains.id, teams.domainId))
        .leftJoin(teamMembers, eq(teamMembers.teamId, teams.id))
        .where(whereClause),
    ]);

    res.json({ success: true, data: rows, meta: { page, limit, total } });
  } catch (error) {
    req.log.error({ err: error }, "Get teams error");
    res.status(500).json({ success: false, message: "Failed to fetch teams" });
  }
};

export const getTeamById = async (req: Request, res: Response): Promise<void> => {
  try {
    const teamId = String(req.params.teamId);
    const [team] = await db
      .select({
        id: teams.id,
        teamId: teams.teamId,
        registrationId: teams.registrationId,
        teamName: teams.teamName,
        status: teams.status,
        createdAt: teams.createdAt,
        domainName: domains.name,
      })
      .from(teams)
      .innerJoin(domains, eq(domains.id, teams.domainId))
      .where(or(eq(teams.teamId, teamId), eq(teams.registrationId, teamId))!)
      .limit(1);

    if (!team) {
      res.status(404).json({ success: false, message: "Team not found" });
      return;
    }

    const members = await db
      .select({
        id: teamMembers.id,
        role: teamMembers.role,
        fullName: teamMembers.fullName,
        email: teamMembers.email,
        emailVerified: teamMembers.emailVerifiedAt,
        collegeName: colleges.name,
        branch: teamMembers.branch,
        yearOfStudy: teamMembers.yearOfStudy,
        region: teamMembers.region,
      })
      .from(teamMembers)
      .innerJoin(colleges, eq(colleges.id, teamMembers.collegeId))
      .where(eq(teamMembers.teamId, team.id));

    res.json({ success: true, data: { ...team, members } });
  } catch (error) {
    req.log.error({ err: error }, "Get team error");
    res.status(500).json({ success: false, message: "Failed to fetch team" });
  }
};

// Manual override so admins can confirm/cancel a team regardless of the
// payment gateway state (disputes, no-shows, gateway issues).
export const updateTeamStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = updateTeamStatusSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, message: "Invalid data", errors: validation.error.issues });
      return;
    }

    const id = Number(req.params.id);
    const [updated] = await db
      .update(teams)
      .set({ status: validation.data.status })
      .where(eq(teams.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ success: false, message: "Team not found" });
      return;
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    req.log.error({ err: error }, "Update team status error");
    res.status(500).json({ success: false, message: "Failed to update team status" });
  }
};

// Bulk-advances CONFIRMED (Round 1) teams to Round 2: flips each to
// PENDING_PAYMENT and emails the leader a payment link. Teams that aren't
// CONFIRMED are skipped rather than rejected, so one wrong row in a 50+
// team selection doesn't fail the whole batch.
export const selectTeamsForRound2 = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = selectTeamsForRound2Schema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, message: "Invalid data", errors: validation.error.issues });
      return;
    }

    const result = await selectTeamsForRound2Service(validation.data.teamIds);

    res.json({ success: true, data: result });
  } catch (error) {
    req.log.error({ err: error }, "Select teams for Round 2 error");
    res.status(500).json({ success: false, message: "Failed to select teams for Round 2" });
  }
};

export const getParticipants = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit, offset } = pagination(req);
    const search = String(req.query.search ?? "").trim();
    const teamId = String(req.query.teamId ?? "").trim();
    const whereClause = and(
      search ? or(ilike(teamMembers.fullName, `%${search}%`), ilike(teamMembers.email, `%${search}%`))! : undefined,
      teamId ? eq(teams.teamId, teamId) : undefined
    );
    const [rows, [{ count: total } = { count: 0 }]] = await Promise.all([
      db
        .select({
          id: teamMembers.id,
          teamId: teams.teamId,
          name: teamMembers.fullName,
          email: teamMembers.email,
          emailVerified: teamMembers.emailVerifiedAt,
          role: teamMembers.role,
          college: colleges.name,
          branch: teamMembers.branch,
          yearOfStudy: teamMembers.yearOfStudy,
          region: teamMembers.region,
          teamName: teams.teamName,
          createdAt: teamMembers.createdAt,
        })
        .from(teamMembers)
        .innerJoin(colleges, eq(colleges.id, teamMembers.collegeId))
        .innerJoin(teams, eq(teams.id, teamMembers.teamId))
        .where(whereClause)
        .orderBy(desc(teamMembers.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(teamMembers)
        .innerJoin(colleges, eq(colleges.id, teamMembers.collegeId))
        .innerJoin(teams, eq(teams.id, teamMembers.teamId))
        .where(whereClause),
    ]);
    res.json({ success: true, data: rows, meta: { page, limit, total } });
  } catch (error) {
    req.log.error({ err: error }, "Get participants error");
    res.status(500).json({ success: false, message: "Failed to fetch participants" });
  }
};

export const getParticipantById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const [participant] = await db
      .select({
        id: teamMembers.id,
        name: teamMembers.fullName,
        email: teamMembers.email,
        emailVerified: teamMembers.emailVerifiedAt,
        role: teamMembers.role,
        college: colleges.name,
        branch: teamMembers.branch,
        yearOfStudy: teamMembers.yearOfStudy,
        region: teamMembers.region,
        teamName: teams.teamName,
      })
      .from(teamMembers)
      .innerJoin(colleges, eq(colleges.id, teamMembers.collegeId))
      .innerJoin(teams, eq(teams.id, teamMembers.teamId))
      .where(eq(teamMembers.id, id))
      .limit(1);
    if (!participant) {
      res.status(404).json({ success: false, message: "Participant not found" });
      return;
    }
    res.json({ success: true, data: participant });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch participant" });
  }
};

const paymentSelection = {
  id: payments.id,
  paymentId: payments.paymentId,
  teamId: teams.teamId,
  teamName: teams.teamName,
  amount: payments.amount,
  currency: payments.currency,
  status: payments.status,
  method: payments.method,
  failureReason: payments.failureReason,
  razorpayOrderId: payments.razorpayOrderId,
  razorpayPaymentId: payments.razorpayPaymentId,
  paidAt: payments.paidAt,
  createdAt: payments.createdAt,
};

export const getPayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit, offset } = pagination(req);
    const search = String(req.query.search ?? "").trim();
    const status = String(req.query.status ?? "").trim();

    if (status && !paymentStatusValues.includes(status as (typeof paymentStatusValues)[number])) {
      res.status(400).json({ success: false, message: "Invalid status filter" });
      return;
    }

    const filters: SQL[] = [];
    if (status) filters.push(eq(payments.status, status as (typeof paymentStatusValues)[number]));
    if (search) {
      filters.push(
        or(
          ilike(teams.teamName, `%${search}%`),
          ilike(payments.paymentId, `%${search}%`),
          ilike(payments.razorpayOrderId, `%${search}%`),
          ilike(payments.razorpayPaymentId, `%${search}%`)
        )!
      );
    }
    const whereClause = filters.length ? and(...filters) : undefined;

    const [rows, [{ count: total } = { count: 0 }]] = await Promise.all([
      db
        .select(paymentSelection)
        .from(payments)
        .innerJoin(teams, eq(teams.id, payments.teamId))
        .where(whereClause)
        .orderBy(desc(payments.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(payments)
        .innerJoin(teams, eq(teams.id, payments.teamId))
        .where(whereClause),
    ]);

    res.json({ success: true, data: rows, meta: { page, limit, total } });
  } catch (error) {
    req.log.error({ err: error }, "Get payments error");
    res.status(500).json({ success: false, message: "Failed to fetch payments" });
  }
};

export const getPaymentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const [payment] = await db
      .select(paymentSelection)
      .from(payments)
      .innerJoin(teams, eq(teams.id, payments.teamId))
      .where(eq(payments.id, id))
      .limit(1);
    if (!payment) {
      res.status(404).json({ success: false, message: "Payment not found" });
      return;
    }
    res.json({ success: true, data: payment });
  } catch (error) {
    req.log.error({ err: error }, "Get payment error");
    res.status(500).json({ success: false, message: "Failed to fetch payment" });
  }
};

export const getDomainsAdmin = async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await db.select().from(domains).orderBy(desc(domains.createdAt));
    res.json({ success: true, data });
  } catch (error) {
    _req.log.error({ err: error }, "Get domains error");
    res.status(500).json({ success: false, message: "Failed to fetch domains" });
  }
};

export const createDomain = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = createDomainSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, message: "Invalid data", errors: validation.error.issues });
      return;
    }
    const [created] = await db.insert(domains).values(validation.data).returning();
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    req.log.error({ err: error }, "Create domain error");
    res.status(500).json({ success: false, message: "Failed to create domain" });
  }
};

export const updateDomain = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = updateDomainSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, message: "Invalid data", errors: validation.error.issues });
      return;
    }
    const id = Number(req.params.id);
    const [updated] = await db.update(domains).set(validation.data).where(eq(domains.id, id)).returning();
    if (!updated) {
      res.status(404).json({ success: false, message: "Domain not found" });
      return;
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    req.log.error({ err: error }, "Update domain error");
    res.status(500).json({ success: false, message: "Failed to update domain" });
  }
};

export const toggleDomainStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = toggleActiveSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, message: "Invalid data", errors: validation.error.issues });
      return;
    }
    const id = Number(req.params.id);
    const [updated] = await db.update(domains).set({ isActive: validation.data.isActive }).where(eq(domains.id, id)).returning();
    if (!updated) {
      res.status(404).json({ success: false, message: "Domain not found" });
      return;
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    req.log.error({ err: error }, "Toggle domain status error");
    res.status(500).json({ success: false, message: "Failed to update domain status" });
  }
};

export const getCollegesAdmin = async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await db.select().from(colleges).orderBy(desc(colleges.createdAt));
    res.json({ success: true, data });
  } catch (error) {
    _req.log.error({ err: error }, "Get colleges error");
    res.status(500).json({ success: false, message: "Failed to fetch colleges" });
  }
};

export const createCollege = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = createCollegeSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, message: "Invalid data", errors: validation.error.issues });
      return;
    }
    const [created] = await db.insert(colleges).values(validation.data).returning();
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    req.log.error({ err: error }, "Create college error");
    res.status(500).json({ success: false, message: "Failed to create college" });
  }
};

export const updateCollege = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = updateCollegeSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, message: "Invalid data", errors: validation.error.issues });
      return;
    }
    const id = Number(req.params.id);
    const [updated] = await db.update(colleges).set(validation.data).where(eq(colleges.id, id)).returning();
    if (!updated) {
      res.status(404).json({ success: false, message: "College not found" });
      return;
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    req.log.error({ err: error }, "Update college error");
    res.status(500).json({ success: false, message: "Failed to update college" });
  }
};

export const toggleCollegeStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = toggleActiveSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, message: "Invalid data", errors: validation.error.issues });
      return;
    }
    const id = Number(req.params.id);
    const [updated] = await db.update(colleges).set({ isActive: validation.data.isActive }).where(eq(colleges.id, id)).returning();
    if (!updated) {
      res.status(404).json({ success: false, message: "College not found" });
      return;
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    req.log.error({ err: error }, "Toggle college status error");
    res.status(500).json({ success: false, message: "Failed to update college status" });
  }
};

export const getRoundsAdmin = async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await db.select().from(rounds).orderBy(asc(rounds.roundNumber));
    res.json({ success: true, data });
  } catch (error) {
    _req.log.error({ err: error }, "Get rounds error");
    res.status(500).json({ success: false, message: "Failed to fetch rounds" });
  }
};

export const createRound = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = createRoundSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, message: "Invalid data", errors: validation.error.issues });
      return;
    }
    const [created] = await db.insert(rounds).values(validation.data).returning();
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    req.log.error({ err: error }, "Create round error");
    res.status(500).json({ success: false, message: "Failed to create round" });
  }
};

export const updateRound = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = updateRoundSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, message: "Invalid data", errors: validation.error.issues });
      return;
    }
    const id = Number(req.params.id);
    const [updated] = await db.update(rounds).set(validation.data).where(eq(rounds.id, id)).returning();
    if (!updated) {
      res.status(404).json({ success: false, message: "Round not found" });
      return;
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    req.log.error({ err: error }, "Update round error");
    res.status(500).json({ success: false, message: "Failed to update round" });
  }
};

export const toggleRoundStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = toggleRoundStatusSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, message: "Invalid data", errors: validation.error.issues });
      return;
    }
    const id = Number(req.params.id);
    const [updated] = await db.update(rounds).set({ status: validation.data.status }).where(eq(rounds.id, id)).returning();
    if (!updated) {
      res.status(404).json({ success: false, message: "Round not found" });
      return;
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    req.log.error({ err: error }, "Toggle round status error");
    res.status(500).json({ success: false, message: "Failed to update round status" });
  }
};

export const getProblemStatementsAdmin = async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await db
      .select({
        id: problemStatements.id,
        problemStatementId: problemStatements.problemStatementId,
        title: problemStatements.title,
        description: problemStatements.description,
        isPublished: problemStatements.isPublished,
        domainName: domains.name,
        createdAt: problemStatements.createdAt,
      })
      .from(problemStatements)
      .leftJoin(domains, eq(domains.id, problemStatements.domainId))
      .orderBy(desc(problemStatements.createdAt));
    res.json({ success: true, data });
  } catch (error) {
    _req.log.error({ err: error }, "Get problem statements error");
    res.status(500).json({ success: false, message: "Failed to fetch problem statements" });
  }
};

export const createProblemStatement = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = createProblemStatementSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, message: "Invalid data", errors: validation.error.issues });
      return;
    }
    const [created] = await db.insert(problemStatements).values(validation.data).returning();
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    req.log.error({ err: error }, "Create problem statement error");
    res.status(500).json({ success: false, message: "Failed to create problem statement" });
  }
};

export const updateProblemStatement = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = updateProblemStatementSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, message: "Invalid data", errors: validation.error.issues });
      return;
    }
    const id = Number(req.params.id);
    const [updated] = await db.update(problemStatements).set(validation.data).where(eq(problemStatements.id, id)).returning();
    if (!updated) {
      res.status(404).json({ success: false, message: "Problem statement not found" });
      return;
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    req.log.error({ err: error }, "Update problem statement error");
    res.status(500).json({ success: false, message: "Failed to update problem statement" });
  }
};

export const publishProblemStatement = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = togglePublishedSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, message: "Invalid data", errors: validation.error.issues });
      return;
    }
    const id = Number(req.params.id);
    const [updated] = await db
      .update(problemStatements)
      .set({ isPublished: validation.data.isPublished })
      .where(eq(problemStatements.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ success: false, message: "Problem statement not found" });
      return;
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    req.log.error({ err: error }, "Publish problem statement error");
    res.status(500).json({ success: false, message: "Failed to update problem statement" });
  }
};
