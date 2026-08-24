import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./migrations/schema";
import { logger } from "../lib/logger";

// Defaults sized for a single small Render instance talking to Supabase's
// pooler (PgBouncer) rather than Postgres directly — `max` here bounds how
// many pooler client connections THIS process holds, not the number of real
// Postgres backends. If this is ever scaled to multiple instances, keep
// instances * DB_POOL_MAX comfortably under the pooler's client connection
// limit.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX ?? 10),
  idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_TIMEOUT_MS ?? 30_000),
  // Without this, pg's default is 0 (no timeout) — once the pool is
  // exhausted during a traffic spike, waiting requests would hang
  // indefinitely instead of failing fast with a clear 503.
  connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS ?? 5_000),
  // Bounds how long any single query can hold a connection, so one stuck
  // query can't quietly exhaust the whole pool during a spike.
  statement_timeout: Number(process.env.DB_STATEMENT_TIMEOUT_MS ?? 15_000),
});

// pg's Pool emits 'error' for background problems on idle clients (e.g. a
// dropped connection to Supabase) — with no listener, EventEmitter throws,
// which otherwise surfaces as an unhandled exception instead of a log line.
pool.on("error", (err) => {
  logger.error({ err }, "Postgres pool error");
});

export const db = drizzle(pool, {
  schema,
});