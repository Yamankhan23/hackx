-- Adds columns to capture the Razorpay payment method (card/upi/netbanking/wallet)
-- and a human-readable failure reason, both sourced from the Razorpay webhook
-- payload. Review before running against your database (e.g. via the Supabase
-- SQL editor, or `psql "$DATABASE_URL" -f this_file.sql`).

ALTER TABLE "payments" ADD COLUMN "method" varchar(30);
ALTER TABLE "payments" ADD COLUMN "failure_reason" text;
