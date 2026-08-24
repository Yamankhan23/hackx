-- Adds a lightweight Postgres-backed email job queue.
-- Registration / leader verification / continue-application /
-- payment-confirmation flows insert a row here instead of awaiting
-- the email provider directly, so a Resend outage can never fail or
-- delay the request that recorded the job. A background worker in the
-- Node process (see email-queue.service.ts) claims and sends jobs using
-- SELECT ... FOR UPDATE SKIP LOCKED, which stays safe across multiple
-- app instances if this is ever scaled horizontally.
--
-- Apply this migration in the Supabase SQL Editor or with:
-- psql "$DATABASE_URL" -f this_file.sql

CREATE TYPE "public"."email_job_status" AS ENUM (
  'pending',
  'processing',
  'sent',
  'retrying',
  'failed'
);

CREATE TABLE "public"."email_jobs" (
  "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "dedupe_key" varchar(200) NOT NULL,
  "email_type" varchar(50) NOT NULL,
  "recipient" varchar(255) NOT NULL,
  "payload" text NOT NULL,
  "status" "public"."email_job_status" DEFAULT 'pending' NOT NULL,
  "attempts" smallint DEFAULT 0 NOT NULL,
  "max_attempts" smallint DEFAULT 6 NOT NULL,
  "next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_error" text,
  "locked_at" timestamp with time zone,
  "locked_by" varchar(100),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "sent_at" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "email_jobs_dedupe_key_key" UNIQUE ("dedupe_key")
);

-- Used by the background worker when claiming pending/retrying jobs.
CREATE INDEX "idx_email_jobs_claim"
ON "public"."email_jobs" ("status", "next_attempt_at");

-- Enable Row Level Security.
ALTER TABLE "public"."email_jobs" ENABLE ROW LEVEL SECURITY;
