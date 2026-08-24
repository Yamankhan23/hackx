import { sql } from "drizzle-orm";
import crypto from "crypto";
import { db } from "../db";
import { emailJobs } from "../db/migrations/schema";
import { logger } from "../lib/logger";
import {
  EMAIL_QUEUE_BASE_DELAY_MS,
  EMAIL_QUEUE_BATCH_SIZE,
  EMAIL_QUEUE_MAX_ATTEMPTS,
  EMAIL_QUEUE_POLL_INTERVAL_MS,
  EMAIL_QUEUE_STALE_LOCK_MS,
  EMAIL_SEND_TIMEOUT_MS,
} from "../lib/constants";
import {
  sendConfirmRegistrationEmail,
  sendPaymentConfirmationEmail,
  sendPaymentLinkEmail,
  sendRegistrationConfirmationEmail,
  sendRound2SelectionEmail,
  sendVerificationEmail,
} from "./email.service";

// Every job type this queue knows how to send, and the function that sends
// it. Adding a new transactional email means adding one entry here.
const DISPATCH: Record<string, (payload: any) => Promise<unknown>> = {
  verification: (p) => sendVerificationEmail(p),
  confirm_registration: (p) => sendConfirmRegistrationEmail(p),
  registration_confirmed: (p) => sendRegistrationConfirmationEmail(p),
  round2_selection: (p) => sendRound2SelectionEmail(p),
  payment_link: (p) => sendPaymentLinkEmail(p),
  payment_confirmation: (p) => sendPaymentConfirmationEmail(p),
};

export type EmailJobInput = {
  emailType: keyof typeof DISPATCH;
  recipient: string;
  payload: Record<string, unknown>;
  // Uniquely identifies "this email for this event" — a duplicate enqueue
  // (concurrent requests, a retried caller, a re-run of the same business
  // event) is a no-op instead of a second email. Callers should derive this
  // from something stable for the event (e.g. `payment_confirmation:<teamId>`).
  dedupeKey: string;
};

/**
 * Records an email to be sent. Always fast (a single insert) and never
 * throws — a DB hiccup here is logged and swallowed so it can never fail
 * the registration/payment/verification request that's already succeeded.
 * The actual send happens later, out-of-request, via the background worker.
 */
export const enqueueEmailJob = async ({
  emailType,
  recipient,
  payload,
  dedupeKey,
}: EmailJobInput): Promise<void> => {
  try {
    const [inserted] = await db
      .insert(emailJobs)
      .values({
        emailType,
        recipient,
        payload: JSON.stringify(payload),
        dedupeKey,
        maxAttempts: EMAIL_QUEUE_MAX_ATTEMPTS,
      })
      .onConflictDoNothing({ target: emailJobs.dedupeKey })
      .returning({ id: emailJobs.id });

    if (inserted) {
      // Best-effort nudge for near-real-time delivery; the poll loop is the
      // real safety net if this races ahead of the enqueue transaction
      // committing or the worker is mid-tick already.
      scheduleImmediateTick();
    }
  } catch (error) {
    logger.error(
      { err: error, emailType, dedupeKey },
      "Failed to enqueue email job"
    );
  }
};

// Exported for testing. attempts=1 -> base delay, attempts=2 -> 2x, etc.,
// plus up to 1s of jitter to avoid many jobs retrying in lockstep.
export const backoffMs = (attempts: number): number => {
  const exponential = EMAIL_QUEUE_BASE_DELAY_MS * 2 ** Math.max(attempts - 1, 0);
  const jitter = Math.floor(Math.random() * 1000);
  return exponential + jitter;
};

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Email send timed out after ${ms}ms`)),
      ms
    );
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });

const WORKER_ID = `${process.pid}-${crypto.randomBytes(4).toString("hex")}`;

type ClaimedJob = {
  id: number;
  email_type: string;
  recipient: string;
  payload: string;
  attempts: number;
  max_attempts: number;
};

/**
 * Atomically claims up to `batchSize` due jobs: pending/retrying jobs whose
 * next_attempt_at has arrived, plus anything stuck in "processing" past the
 * stale-lock threshold (a worker that crashed mid-send). The CTE + UPDATE is
 * a single statement, and FOR UPDATE SKIP LOCKED means concurrent workers
 * (e.g. multiple Render instances, if this is ever scaled out) never claim
 * the same row twice.
 */
const claimJobs = async (batchSize: number): Promise<ClaimedJob[]> => {
  const result = await db.execute<ClaimedJob>(sql`
    WITH claimed AS (
      SELECT id FROM email_jobs
      WHERE (status IN ('pending', 'retrying') AND next_attempt_at <= now())
         OR (status = 'processing' AND locked_at < now() - interval '1 millisecond' * ${EMAIL_QUEUE_STALE_LOCK_MS})
      ORDER BY next_attempt_at
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE email_jobs
    SET status = 'processing', locked_at = now(), locked_by = ${WORKER_ID}, updated_at = now()
    WHERE id IN (SELECT id FROM claimed)
    RETURNING id, email_type, recipient, payload, attempts, max_attempts
  `);

  return result.rows;
};

const markSent = async (id: number) => {
  await db.execute(sql`
    UPDATE email_jobs
    SET status = 'sent', sent_at = now(), updated_at = now(), last_error = NULL
    WHERE id = ${id}
  `);
};

const markFailedOrRetrying = async (
  id: number,
  attempts: number,
  maxAttempts: number,
  errorMessage: string
) => {
  const terminal = attempts >= maxAttempts;

  await db.execute(sql`
    UPDATE email_jobs
    SET
      status = ${terminal ? "failed" : "retrying"},
      attempts = ${attempts},
      next_attempt_at = now() + interval '1 millisecond' * ${terminal ? 0 : backoffMs(attempts)},
      last_error = ${errorMessage.slice(0, 500)},
      updated_at = now()
    WHERE id = ${id}
  `);
};

let isTicking = false;
let tickTimer: ReturnType<typeof setInterval> | null = null;

const processOneJob = async (job: ClaimedJob) => {
  const handler = DISPATCH[job.email_type];
  const attempt = job.attempts + 1;

  if (!handler) {
    logger.error(
      { jobId: job.id, emailType: job.email_type },
      "Email job has no known handler — marking failed"
    );
    await markFailedOrRetrying(job.id, job.max_attempts, job.max_attempts, "Unknown email_type");
    return;
  }

  try {
    const payload = JSON.parse(job.payload);
    await withTimeout(handler(payload), EMAIL_SEND_TIMEOUT_MS);
    await markSent(job.id);
    logger.info(
      { jobId: job.id, emailType: job.email_type, recipient: job.recipient, attempt },
      "Email job sent"
    );
  } catch (error) {
    // Never include the parsed payload here — it may contain a raw
    // verification/resume token.
    const message = error instanceof Error ? error.message : String(error);
    await markFailedOrRetrying(job.id, attempt, job.max_attempts, message);

    if (attempt >= job.max_attempts) {
      logger.error(
        { jobId: job.id, emailType: job.email_type, recipient: job.recipient, attempt, err: message },
        "Email job permanently failed after max attempts"
      );
    } else {
      logger.error(
        { jobId: job.id, emailType: job.email_type, recipient: job.recipient, attempt, err: message },
        "Email job failed, will retry"
      );
    }
  }
};

const tick = async () => {
  if (isTicking) return;
  isTicking = true;

  try {
    const jobs = await claimJobs(EMAIL_QUEUE_BATCH_SIZE);
    if (jobs.length === 0) return;

    await Promise.allSettled(jobs.map(processOneJob));
  } catch (error) {
    logger.error({ err: error }, "Email queue tick failed");
  } finally {
    isTicking = false;
  }
};

const scheduleImmediateTick = () => {
  // Fire-and-forget; the interval loop is the durable fallback so this is
  // purely a latency optimization, never a correctness requirement.
  setImmediate(() => {
    tick().catch((error) => logger.error({ err: error }, "Email queue immediate tick failed"));
  });
};

export const startEmailQueueWorker = () => {
  if (tickTimer) return;

  tickTimer = setInterval(() => {
    tick().catch((error) => logger.error({ err: error }, "Email queue tick failed"));
  }, EMAIL_QUEUE_POLL_INTERVAL_MS);

  // Don't let the poll timer itself keep the process alive on shutdown.
  tickTimer.unref?.();

  logger.info(
    { pollIntervalMs: EMAIL_QUEUE_POLL_INTERVAL_MS, batchSize: EMAIL_QUEUE_BATCH_SIZE },
    "Email queue worker started"
  );
};
