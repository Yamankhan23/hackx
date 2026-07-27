import { pgTable, unique, bigint, varchar, text, boolean, timestamp, foreignKey, index, check, smallint, integer, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const adminRole = pgEnum("admin_role", ['ADMIN', 'SUPER_ADMIN'])
export const paymentStatus = pgEnum("payment_status", ['CREATED', 'PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'])
export const roundStatus = pgEnum("round_status", ['UPCOMING', 'ACTIVE', 'COMPLETED'])
export const roundType = pgEnum("round_type", ['ONLINE', 'OFFLINE'])
export const teamMemberRole = pgEnum("team_member_role", ['LEADER', 'MEMBER'])
export const teamStatus = pgEnum("team_status", ['DRAFT', 'PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED'])


export const domains = pgTable("domains", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "domains_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	name: varchar({ length: 150 }).notNull(),
	description: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("domains_name_key").on(table.name),
]);

export const problemStatements = pgTable("problem_statements", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "problem_statements_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	problemStatementId: varchar("problem_statement_id", { length: 30 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	domainId: bigint("domain_id", { mode: "number" }),
	title: varchar({ length: 255 }).notNull(),
	description: text().notNull(),
	isPublished: boolean("is_published").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.domainId],
			foreignColumns: [domains.id],
			name: "problem_statements_domain_id_fkey"
		}).onDelete("set null"),
	unique("problem_statements_problem_statement_id_key").on(table.problemStatementId),
]);

export const teams = pgTable("teams", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "teams_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	teamId: varchar("team_id", { length: 30 }).notNull(),
	registrationId: varchar("registration_id", { length: 30 }),
	teamName: varchar("team_name", { length: 150 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	domainId: bigint("domain_id", { mode: "number" }).notNull(),
	status: teamStatus().default('DRAFT').notNull(),
	declarationAccepted: boolean("declaration_accepted").default(false).notNull(),
	declarationAcceptedAt: timestamp("declaration_accepted_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_teams_domain_id").using("btree", table.domainId.asc().nullsLast().op("int8_ops")),
	index("idx_teams_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.domainId],
			foreignColumns: [domains.id],
			name: "teams_domain_id_fkey"
		}).onDelete("restrict"),
	unique("teams_team_id_key").on(table.teamId),
	unique("teams_registration_id_key").on(table.registrationId),
	unique("teams_team_name_key").on(table.teamName),
]);

export const colleges = pgTable("colleges", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "colleges_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	collegeId: varchar("college_id", { length: 20 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	university: varchar({ length: 255 }),
	region: varchar({ length: 100 }).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("colleges_college_id_key").on(table.collegeId),
	unique("colleges_name_unique").on(table.name),
]);

export const teamMembers = pgTable("team_members", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "team_members_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	teamId: bigint("team_id", { mode: "number" }).notNull(),
	role: teamMemberRole().default('MEMBER').notNull(),
	fullName: varchar("full_name", { length: 150 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true, mode: 'string' }),
	mobileNumber: varchar("mobile_number", { length: 20 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	collegeId: bigint("college_id", { mode: "number" }).notNull(),
	region: varchar({ length: 100 }).notNull(),
	branch: varchar({ length: 150 }).notNull(),
	yearOfStudy: smallint("year_of_study").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_team_members_college_id").using("btree", table.collegeId.asc().nullsLast().op("int8_ops")),
	index("idx_team_members_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("idx_team_members_team_id").using("btree", table.teamId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.collegeId],
			foreignColumns: [colleges.id],
			name: "team_members_college_id_fkey"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "team_members_team_id_fkey"
		}).onDelete("cascade"),
	check("team_members_year_of_study_check", sql`(year_of_study >= 1) AND (year_of_study <= 6)`),
]);

export const payments = pgTable("payments", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "payments_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	paymentId: varchar("payment_id", { length: 30 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	teamId: bigint("team_id", { mode: "number" }).notNull(),
	razorpayOrderId: varchar("razorpay_order_id", { length: 255 }),
	razorpayPaymentId: varchar("razorpay_payment_id", { length: 255 }),
	razorpaySignature: text("razorpay_signature"),
	amount: integer().default(400).notNull(),
	currency: varchar({ length: 3 }).default('INR').notNull(),
	status: paymentStatus().default('CREATED').notNull(),
	paidAt: timestamp("paid_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_payments_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "payments_team_id_fkey"
		}).onDelete("restrict"),
	unique("payments_payment_id_key").on(table.paymentId),
	unique("payments_team_id_key").on(table.teamId),
	unique("payments_razorpay_order_id_key").on(table.razorpayOrderId),
	unique("payments_razorpay_payment_id_key").on(table.razorpayPaymentId),
	check("payments_amount_check", sql`amount > 0`),
	check("payments_currency_check", sql`(currency)::text = 'INR'::text`),
]);

export const admins = pgTable("admins", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "admins_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	adminId: varchar("admin_id", { length: 20 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	passwordHash: text("password_hash").notNull(),
	role: adminRole().default('ADMIN').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("admins_admin_id_key").on(table.adminId),
	unique("admins_email_key").on(table.email),
]);

export const rounds = pgTable("rounds", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "rounds_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	roundId: varchar("round_id", { length: 20 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	roundNumber: smallint("round_number").notNull(),
	type: roundType().notNull(),
	description: text(),
	startAt: timestamp("start_at", { withTimezone: true, mode: 'string' }),
	endAt: timestamp("end_at", { withTimezone: true, mode: 'string' }),
	status: roundStatus().default('UPCOMING').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("rounds_round_id_key").on(table.roundId),
	unique("rounds_round_number_key").on(table.roundNumber),
	check("rounds_dates_check", sql`(end_at IS NULL) OR (start_at IS NULL) OR (end_at > start_at)`),
	check("rounds_number_check", sql`round_number > 0`),
]);
