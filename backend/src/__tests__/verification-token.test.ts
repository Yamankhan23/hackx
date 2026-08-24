import { describe, expect, it } from "vitest";
import {
  generateVerificationToken,
  hashVerificationToken,
  isTokenFreshlyMinted,
} from "../lib/verification-token";

describe("generateVerificationToken / hashVerificationToken", () => {
  it("generates unique, high-entropy tokens", () => {
    const a = generateVerificationToken();
    const b = generateVerificationToken();

    expect(a).not.toEqual(b);
    expect(a).toHaveLength(64); // 32 bytes as hex
  });

  it("hashes deterministically so a stored hash can be matched later", () => {
    const token = generateVerificationToken();

    expect(hashVerificationToken(token)).toEqual(hashVerificationToken(token));
    expect(hashVerificationToken(token)).not.toEqual(token);
  });
});

// Backs the "Continue Application" concurrency fix: two near-simultaneous
// requests for the same leader should not each mint (and email) a
// different token — the second one should see the first's token as
// "freshly minted" and reuse it instead.
describe("isTokenFreshlyMinted", () => {
  const HOURS = 24;
  const REUSE_WINDOW_MS = 60_000;

  it("is false when there is no existing token", () => {
    expect(isTokenFreshlyMinted(null, HOURS, REUSE_WINDOW_MS)).toBe(false);
    expect(isTokenFreshlyMinted(undefined, HOURS, REUSE_WINDOW_MS)).toBe(false);
  });

  it("is true immediately after minting (simulates a concurrent second request)", () => {
    const now = 1_700_000_000_000;
    const expiresAt = new Date(now + HOURS * 60 * 60 * 1000).toISOString();

    // A request arriving 2 seconds after the first minted this token.
    expect(isTokenFreshlyMinted(expiresAt, HOURS, REUSE_WINDOW_MS, now + 2_000)).toBe(true);
  });

  it("is false once the reuse window has passed (a genuine later resend request)", () => {
    const now = 1_700_000_000_000;
    const expiresAt = new Date(now + HOURS * 60 * 60 * 1000).toISOString();

    expect(
      isTokenFreshlyMinted(expiresAt, HOURS, REUSE_WINDOW_MS, now + REUSE_WINDOW_MS + 1)
    ).toBe(false);
  });

  it("is false once the token has fully expired, even if minted recently", () => {
    const now = 1_700_000_000_000;
    // expiresAt in the past relative to `now`.
    const expiresAt = new Date(now - 1_000).toISOString();

    expect(isTokenFreshlyMinted(expiresAt, HOURS, REUSE_WINDOW_MS, now)).toBe(false);
  });
});
