-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."admin_role" AS ENUM('ADMIN', 'SUPER_ADMIN');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('CREATED', 'PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."round_status" AS ENUM('UPCOMING', 'ACTIVE', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."round_type" AS ENUM('ONLINE', 'OFFLINE');--> statement-breakpoint
CREATE TYPE "public"."team_member_role" AS ENUM('LEADER', 'MEMBER');--> statement-breakpoint
CREATE TYPE "public"."team_status" AS ENUM('DRAFT', 'PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "domains" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "domains_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" varchar(150) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "domains_name_key" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "domains" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "problem_statements" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "problem_statements_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"problem_statement_id" varchar(30) NOT NULL,
	"domain_id" bigint,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "problem_statements_problem_statement_id_key" UNIQUE("problem_statement_id")
);
--> statement-breakpoint
ALTER TABLE "problem_statements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "teams" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "teams_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"team_id" varchar(30) NOT NULL,
	"registration_id" varchar(30),
	"team_name" varchar(150) NOT NULL,
	"domain_id" bigint NOT NULL,
	"status" "team_status" DEFAULT 'DRAFT' NOT NULL,
	"declaration_accepted" boolean DEFAULT false NOT NULL,
	"declaration_accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teams_team_id_key" UNIQUE("team_id"),
	CONSTRAINT "teams_registration_id_key" UNIQUE("registration_id"),
	CONSTRAINT "teams_team_name_key" UNIQUE("team_name")
);
--> statement-breakpoint
ALTER TABLE "teams" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "colleges" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "colleges_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"college_id" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"university" varchar(255),
	"region" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "colleges_college_id_key" UNIQUE("college_id"),
	CONSTRAINT "colleges_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "colleges" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "team_members_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"team_id" bigint NOT NULL,
	"role" "team_member_role" DEFAULT 'MEMBER' NOT NULL,
	"full_name" varchar(150) NOT NULL,
	"email" varchar(255) NOT NULL,
	"email_verified_at" timestamp with time zone,
	"mobile_number" varchar(20) NOT NULL,
	"college_id" bigint NOT NULL,
	"region" varchar(100) NOT NULL,
	"branch" varchar(150) NOT NULL,
	"year_of_study" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_members_year_of_study_check" CHECK ((year_of_study >= 1) AND (year_of_study <= 6))
);
--> statement-breakpoint
ALTER TABLE "team_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payments" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "payments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"payment_id" varchar(30) NOT NULL,
	"team_id" bigint NOT NULL,
	"razorpay_order_id" varchar(255),
	"razorpay_payment_id" varchar(255),
	"razorpay_signature" text,
	"amount" integer DEFAULT 400 NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"status" "payment_status" DEFAULT 'CREATED' NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_payment_id_key" UNIQUE("payment_id"),
	CONSTRAINT "payments_team_id_key" UNIQUE("team_id"),
	CONSTRAINT "payments_razorpay_order_id_key" UNIQUE("razorpay_order_id"),
	CONSTRAINT "payments_razorpay_payment_id_key" UNIQUE("razorpay_payment_id"),
	CONSTRAINT "payments_amount_check" CHECK (amount > 0),
	CONSTRAINT "payments_currency_check" CHECK ((currency)::text = 'INR'::text)
);
--> statement-breakpoint
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "admins" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "admins_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"admin_id" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "admin_role" DEFAULT 'ADMIN' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admins_admin_id_key" UNIQUE("admin_id"),
	CONSTRAINT "admins_email_key" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "admins" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "rounds" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "rounds_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"round_id" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"round_number" smallint NOT NULL,
	"type" "round_type" NOT NULL,
	"description" text,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"status" "round_status" DEFAULT 'UPCOMING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rounds_round_id_key" UNIQUE("round_id"),
	CONSTRAINT "rounds_round_number_key" UNIQUE("round_number"),
	CONSTRAINT "rounds_dates_check" CHECK ((end_at IS NULL) OR (start_at IS NULL) OR (end_at > start_at)),
	CONSTRAINT "rounds_number_check" CHECK (round_number > 0)
);
--> statement-breakpoint
ALTER TABLE "rounds" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "problem_statements" ADD CONSTRAINT "problem_statements_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_college_id_fkey" FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_teams_domain_id" ON "teams" USING btree ("domain_id" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_teams_status" ON "teams" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "idx_team_members_college_id" ON "team_members" USING btree ("college_id" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_team_members_email" ON "team_members" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "idx_team_members_team_id" ON "team_members" USING btree ("team_id" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_payments_status" ON "payments" USING btree ("status" enum_ops);
*/