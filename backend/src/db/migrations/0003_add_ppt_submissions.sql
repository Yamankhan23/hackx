-- Stores one PPT submission per team. The file itself lives in Google Drive
-- (uploaded via the Drive API using a dedicated account's OAuth refresh
-- token — see lib/google-drive.ts); this table only tracks the metadata and
-- pointer (drive_file_id) needed to list/replace/download it.
--
-- Apply this migration in the Supabase SQL Editor or with:
-- psql "$DATABASE_URL" -f this_file.sql

CREATE TABLE "public"."ppt_submissions" (
  "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "team_id" bigint NOT NULL,
  "uploaded_by_member_id" bigint NOT NULL,
  "drive_file_id" varchar(100) NOT NULL,
  "file_name" varchar(255) NOT NULL,
  "mime_type" varchar(150) NOT NULL,
  "file_size_bytes" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "ppt_submissions_team_id_key" UNIQUE ("team_id"),
  CONSTRAINT "ppt_submissions_team_id_fkey" FOREIGN KEY ("team_id")
    REFERENCES "public"."teams" ("id") ON DELETE CASCADE,
  CONSTRAINT "ppt_submissions_uploaded_by_member_id_fkey" FOREIGN KEY ("uploaded_by_member_id")
    REFERENCES "public"."team_members" ("id") ON DELETE RESTRICT,
  CONSTRAINT "ppt_submissions_file_size_bytes_check" CHECK ("file_size_bytes" > 0)
);

-- Enable Row Level Security.
ALTER TABLE "public"."ppt_submissions" ENABLE ROW LEVEL SECURITY;
