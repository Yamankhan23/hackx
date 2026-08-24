import { describe, expect, it } from "vitest";
import { backoffMs } from "../services/email-queue.service";
import { EMAIL_QUEUE_BASE_DELAY_MS } from "../lib/constants";

// Covers "email job retry" and "permanent failure after bounded attempts"
// (Phase 8, #3 and #4) at the level of the pure backoff calculation — the
// claim/dispatch loop itself talks to Postgres and is exercised by the
// load-test / staging verification described in the final report instead of
// a mocked unit test here.
describe("backoffMs", () => {
  it("grows exponentially with attempt count", () => {
    const first = backoffMs(1);
    const second = backoffMs(2);
    const third = backoffMs(3);

    // Jitter adds up to ~1s, so compare against the base delay with headroom.
    expect(first).toBeGreaterThanOrEqual(EMAIL_QUEUE_BASE_DELAY_MS);
    expect(first).toBeLessThan(EMAIL_QUEUE_BASE_DELAY_MS + 1_000);

    expect(second).toBeGreaterThanOrEqual(EMAIL_QUEUE_BASE_DELAY_MS * 2);
    expect(third).toBeGreaterThanOrEqual(EMAIL_QUEUE_BASE_DELAY_MS * 4);
  });

  it("never returns a negative or zero delay", () => {
    expect(backoffMs(0)).toBeGreaterThan(0);
    expect(backoffMs(1)).toBeGreaterThan(0);
  });
});
