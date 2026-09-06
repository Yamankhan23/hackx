import ExcelJS from "exceljs";
import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";

import { db } from "../db";
import { colleges, domains, payments, teamMembers, teams } from "../db/migrations/schema";
import { teamStatusValues } from "../validators/admin.validator";

const BRAND_FILL = "FF4C1D95";
const SUBTITLE_FONT = "FF6B7280";
const BORDER_COLOR = "FFE2E8F0";
const STRIPE_FILL = "FFF8FAFC";

const TEAM_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_PAYMENT: "Pending payment",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  CREATED: "Pending",
  PENDING: "Pending",
  SUCCESS: "Paid",
  FAILED: "Failed",
  REFUNDED: "Refunded",
};

type Tone = "success" | "warning" | "danger" | "neutral";

const TONE_FILL: Record<Tone, string> = {
  success: "FFD1FAE5",
  warning: "FFFEF3C7",
  danger: "FFFEE2E2",
  neutral: "FFF1F5F9",
};

const TONE_FONT: Record<Tone, string> = {
  success: "FF047857",
  warning: "FF92400E",
  danger: "FFB91C1C",
  neutral: "FF475569",
};

const STATUS_TONE: Record<string, Tone> = {
  CONFIRMED: "success",
  SUCCESS: "success",
  DRAFT: "neutral",
  PENDING_PAYMENT: "warning",
  CREATED: "warning",
  PENDING: "warning",
  CANCELLED: "danger",
  FAILED: "danger",
  REFUNDED: "neutral",
};

export type TeamExportFilters = { search?: string; status?: string };

const thinBorder = {
  top: { style: "thin" as const, color: { argb: BORDER_COLOR } },
  left: { style: "thin" as const, color: { argb: BORDER_COLOR } },
  bottom: { style: "thin" as const, color: { argb: BORDER_COLOR } },
  right: { style: "thin" as const, color: { argb: BORDER_COLOR } },
};

function addTitleBlock(sheet: ExcelJS.Worksheet, title: string, subtitle: string, columnCount: number) {
  sheet.mergeCells(1, 1, 1, columnCount);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { size: 15, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  sheet.getRow(1).height = 26;
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_FILL } };
  });

  sheet.mergeCells(2, 1, 2, columnCount);
  const subtitleCell = sheet.getCell(2, 1);
  subtitleCell.value = subtitle;
  subtitleCell.font = { size: 10, italic: true, color: { argb: SUBTITLE_FONT } };
  subtitleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  sheet.getRow(2).height = 18;
}

// Applies header styling + borders + zebra striping + autofilter + a frozen
// header — shared by every sheet so the report reads as one consistent
// document rather than a pile of ad-hoc tables.
function styleTable(sheet: ExcelJS.Worksheet, headerRowIndex: number, dataRowCount: number, columnCount: number) {
  const headerRow = sheet.getRow(headerRowIndex);
  headerRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_FILL } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = thinBorder;
  });
  headerRow.height = 24;

  for (let i = 0; i < dataRowCount; i += 1) {
    const row = sheet.getRow(headerRowIndex + 1 + i);
    const isStripe = i % 2 === 1;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = thinBorder;
      cell.alignment = { vertical: "middle", horizontal: cell.alignment?.horizontal ?? "left" };
      if (isStripe && !cell.fill) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: STRIPE_FILL } };
      }
    });
  }

  sheet.autoFilter = {
    from: { row: headerRowIndex, column: 1 },
    to: { row: headerRowIndex, column: columnCount },
  };
  sheet.views = [{ state: "frozen", ySplit: headerRowIndex }];
}

function applyToneFill(cell: ExcelJS.Cell, status: string, labels: Record<string, string>) {
  const tone = STATUS_TONE[status] ?? "neutral";
  cell.value = labels[status] ?? status;
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TONE_FILL[tone] } };
  cell.font = { bold: true, color: { argb: TONE_FONT[tone] } };
  cell.alignment = { vertical: "middle", horizontal: "center" };
}

const buildTeamWhereClause = ({ search, status }: TeamExportFilters): SQL | undefined => {
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
  return filters.length ? and(...filters) : undefined;
};

const describeFilters = ({ search, status }: TeamExportFilters): string => {
  const parts = [
    status ? `Status: ${TEAM_STATUS_LABELS[status] ?? status}` : null,
    search ? `Search: "${search}"` : null,
  ].filter((part): part is string => Boolean(part));
  return parts.length ? parts.join("   |   ") : "All teams";
};

type TeamRow = {
  id: number;
  teamId: string;
  registrationId: string | null;
  teamName: string;
  status: string;
  createdAt: string;
  domainName: string | null;
  memberCount: number;
};

function addTeamsSheet(
  workbook: ExcelJS.Workbook,
  teamRows: TeamRow[],
  leaderByTeam: Map<number, { fullName: string; email: string; mobileNumber: string; collegeName: string; region: string }>,
  paymentByTeam: Map<number, { status: string; amount: number; method: string | null }>,
  subtitle: string
) {
  const sheet = workbook.addWorksheet("Teams", { properties: { tabColor: { argb: BRAND_FILL } } });

  const columns: { header: string; width: number }[] = [
    { header: "S.No", width: 7 },
    { header: "Team ID", width: 16 },
    { header: "Team Name", width: 28 },
    { header: "Domain", width: 20 },
    { header: "Status", width: 16 },
    { header: "Members", width: 10 },
    { header: "Leader Name", width: 22 },
    { header: "Leader Email", width: 28 },
    { header: "Leader Mobile", width: 15 },
    { header: "College", width: 32 },
    { header: "Region", width: 14 },
    { header: "Payment Status", width: 15 },
    { header: "Amount Paid", width: 13 },
    { header: "Payment Method", width: 16 },
    { header: "Registered On", width: 20 },
  ];

  addTitleBlock(sheet, "MUSA CodeX 2026 — Teams Report", subtitle, columns.length);

  const headerRowIndex = 4;
  sheet.getRow(headerRowIndex).values = columns.map((c) => c.header);
  columns.forEach((c, i) => {
    sheet.getColumn(i + 1).width = c.width;
  });

  teamRows.forEach((team, index) => {
    const leader = leaderByTeam.get(team.id);
    const payment = paymentByTeam.get(team.id);
    const row = sheet.getRow(headerRowIndex + 1 + index);
    row.values = [
      index + 1,
      team.teamId,
      team.teamName,
      team.domainName ?? "—",
      team.status,
      team.memberCount,
      leader?.fullName ?? "—",
      leader?.email ?? "—",
      leader?.mobileNumber ?? "—",
      leader?.collegeName ?? "—",
      leader?.region ?? "—",
      payment ? payment.status : "—",
      payment && payment.status === "SUCCESS" ? payment.amount : null,
      payment?.method ?? "—",
      new Date(team.createdAt),
    ];
    row.getCell(6).alignment = { horizontal: "center" };
    row.getCell(13).numFmt = '"₹"#,##0';
    row.getCell(15).numFmt = "dd-mmm-yyyy hh:mm AM/PM";
  });

  styleTable(sheet, headerRowIndex, teamRows.length, columns.length);

  teamRows.forEach((team, index) => {
    const payment = paymentByTeam.get(team.id);
    const row = sheet.getRow(headerRowIndex + 1 + index);
    applyToneFill(row.getCell(5), team.status, TEAM_STATUS_LABELS);
    if (payment) applyToneFill(row.getCell(12), payment.status, PAYMENT_STATUS_LABELS);
  });
}

type MemberRow = {
  teamId: number;
  role: string;
  fullName: string;
  email: string;
  emailVerifiedAt: string | null;
  mobileNumber: string;
  collegeName: string;
  branch: string;
  yearOfStudy: number;
  region: string;
};

function addMembersSheet(
  workbook: ExcelJS.Workbook,
  teamMetaById: Map<number, { teamId: string; teamName: string }>,
  memberRows: MemberRow[],
  subtitle: string
) {
  const sheet = workbook.addWorksheet("Team Members", { properties: { tabColor: { argb: BRAND_FILL } } });

  const columns: { header: string; width: number }[] = [
    { header: "S.No", width: 7 },
    { header: "Team ID", width: 16 },
    { header: "Team Name", width: 26 },
    { header: "Role", width: 11 },
    { header: "Full Name", width: 24 },
    { header: "Email", width: 28 },
    { header: "Email Verified", width: 14 },
    { header: "Mobile Number", width: 15 },
    { header: "College", width: 32 },
    { header: "Branch", width: 22 },
    { header: "Year", width: 8 },
    { header: "Region", width: 14 },
  ];

  addTitleBlock(sheet, "MUSA CodeX 2026 — Team Members Report", subtitle, columns.length);

  const headerRowIndex = 4;
  sheet.getRow(headerRowIndex).values = columns.map((c) => c.header);
  columns.forEach((c, i) => {
    sheet.getColumn(i + 1).width = c.width;
  });

  memberRows.forEach((member, index) => {
    const meta = teamMetaById.get(member.teamId);
    const row = sheet.getRow(headerRowIndex + 1 + index);
    row.values = [
      index + 1,
      meta?.teamId ?? "—",
      meta?.teamName ?? "—",
      member.role === "LEADER" ? "Leader" : "Member",
      member.fullName,
      member.email,
      member.emailVerifiedAt ? "Yes" : "No",
      member.mobileNumber,
      member.collegeName,
      member.branch,
      member.yearOfStudy,
      member.region,
    ];
    row.getCell(1).alignment = { horizontal: "center" };
    row.getCell(4).alignment = { horizontal: "center" };
    row.getCell(7).alignment = { horizontal: "center" };
    row.getCell(11).alignment = { horizontal: "center" };
  });

  styleTable(sheet, headerRowIndex, memberRows.length, columns.length);

  memberRows.forEach((member, index) => {
    const row = sheet.getRow(headerRowIndex + 1 + index);
    const cell = row.getCell(7);
    const tone: Tone = member.emailVerifiedAt ? "success" : "neutral";
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TONE_FILL[tone] } };
    cell.font = { bold: true, color: { argb: TONE_FONT[tone] } };
  });
}

export const buildTeamsWorkbook = async (filters: TeamExportFilters): Promise<ExcelJS.Workbook> => {
  const whereClause = buildTeamWhereClause(filters);

  const teamRows = (await db
    .select({
      id: teams.id,
      teamId: teams.teamId,
      registrationId: teams.registrationId,
      teamName: teams.teamName,
      status: teams.status,
      createdAt: teams.createdAt,
      domainName: domains.name,
      memberCount: sql<number>`count(distinct ${teamMembers.id})::int`,
    })
    .from(teams)
    .innerJoin(domains, eq(domains.id, teams.domainId))
    .leftJoin(teamMembers, eq(teamMembers.teamId, teams.id))
    .where(whereClause)
    .groupBy(teams.id, domains.name)
    .orderBy(desc(teams.createdAt))) as TeamRow[];

  const teamIds = teamRows.map((t) => t.id);

  const [leaders, paymentRows, memberRows] = teamIds.length
    ? await Promise.all([
        db
          .select({
            teamId: teamMembers.teamId,
            fullName: teamMembers.fullName,
            email: teamMembers.email,
            mobileNumber: teamMembers.mobileNumber,
            collegeName: colleges.name,
            region: teamMembers.region,
          })
          .from(teamMembers)
          .innerJoin(colleges, eq(colleges.id, teamMembers.collegeId))
          .where(and(eq(teamMembers.role, "LEADER"), inArray(teamMembers.teamId, teamIds))),
        db
          .select({
            teamId: payments.teamId,
            status: payments.status,
            amount: payments.amount,
            method: payments.method,
          })
          .from(payments)
          .where(inArray(payments.teamId, teamIds)),
        db
          .select({
            teamId: teamMembers.teamId,
            role: teamMembers.role,
            fullName: teamMembers.fullName,
            email: teamMembers.email,
            emailVerifiedAt: teamMembers.emailVerifiedAt,
            mobileNumber: teamMembers.mobileNumber,
            collegeName: colleges.name,
            branch: teamMembers.branch,
            yearOfStudy: teamMembers.yearOfStudy,
            region: teamMembers.region,
          })
          .from(teamMembers)
          .innerJoin(colleges, eq(colleges.id, teamMembers.collegeId))
          .where(inArray(teamMembers.teamId, teamIds))
          .orderBy(asc(teamMembers.teamId), asc(teamMembers.role)),
      ])
    : [[], [], []];

  const leaderByTeam = new Map(leaders.map((l) => [l.teamId, l]));
  const paymentByTeam = new Map(paymentRows.map((p) => [p.teamId, p]));
  const teamMetaById = new Map(teamRows.map((t) => [t.id, { teamId: t.teamId, teamName: t.teamName }]));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MUSA CodeX 2026 Admin";
  workbook.created = new Date();

  const subtitle = `Generated on ${new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}   |   ${describeFilters(filters)}   |   ${teamRows.length} team${teamRows.length === 1 ? "" : "s"}`;

  addTeamsSheet(workbook, teamRows, leaderByTeam, paymentByTeam, subtitle);
  addMembersSheet(workbook, teamMetaById, memberRows as MemberRow[], subtitle);

  return workbook;
};
