export const VERIFICATION_EXPIRY_HOURS = 24;

// Pinned explicitly on both sign and verify so a future change to one side
// can't silently drift from the other, and so verify never falls back to
// accepting an unexpected algorithm.
export const ADMIN_JWT_ALGORITHM = "HS256" as const;

// Flat registration fee per team, charged once by the team leader after
// every member has verified their email. Stored/quoted in whole rupees;
// converted to paise only at the Razorpay API boundary (see lib/razorpay.ts).
export const REGISTRATION_FEE_RUPEES = 400;

// If a leader already has a live, unexpired resume/verification token
// minted within this window, "Continue Application" reuses it instead of
// minting a new one — otherwise two near-simultaneous requests (double
// click, a network retry) would each mint a different token, and only the
// last write stays valid, silently breaking the first email's link.
export const RESUME_TOKEN_REUSE_WINDOW_MS = 60_000;

// --- Email queue (see services/email-queue.service.ts) ---

// How often the in-process worker polls for due jobs. Kept modest — emails
// aren't latency-critical, and a small Render instance shouldn't be
// hammering Postgres every second.
export const EMAIL_QUEUE_POLL_INTERVAL_MS = Number(
  process.env.EMAIL_QUEUE_POLL_INTERVAL_MS ?? 5_000
);

// Jobs claimed per poll tick.
export const EMAIL_QUEUE_BATCH_SIZE = Number(
  process.env.EMAIL_QUEUE_BATCH_SIZE ?? 10
);

// Bounded retries with exponential backoff: attempt 1 fails -> retry after
// ~30s, then ~1m, ~2m, ~4m, ~8m, then permanently `failed` after the 6th
// attempt (~15 minutes total). Never retries forever.
export const EMAIL_QUEUE_BASE_DELAY_MS = Number(
  process.env.EMAIL_QUEUE_BASE_DELAY_MS ?? 30_000
);
export const EMAIL_QUEUE_MAX_ATTEMPTS = Number(
  process.env.EMAIL_QUEUE_MAX_ATTEMPTS ?? 6
);

// A job stuck in "processing" (worker crashed mid-send) longer than this is
// treated as claimable again rather than lost forever.
export const EMAIL_QUEUE_STALE_LOCK_MS = Number(
  process.env.EMAIL_QUEUE_STALE_LOCK_MS ?? 2 * 60_000
);

// Guards against a single hung provider call blocking the whole worker tick.
export const EMAIL_SEND_TIMEOUT_MS = Number(
  process.env.EMAIL_SEND_TIMEOUT_MS ?? 15_000
);
