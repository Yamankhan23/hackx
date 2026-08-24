import crypto from "crypto";

export const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

export const hashVerificationToken = (token: string) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

/**
 * True if a token minted with the given expiry is still live AND was minted
 * within `reuseWindowMs` of `now`. Used to decide whether a near-simultaneous
 * repeat request (e.g. double-click on "Continue Application") should reuse
 * the token an earlier request just minted instead of minting — and
 * emailing — a second one.
 */
export const isTokenFreshlyMinted = (
  expiresAtIso: string | null | undefined,
  verificationExpiryHours: number,
  reuseWindowMs: number,
  now: number = Date.now()
): boolean => {
  if (!expiresAtIso) return false;

  const expiresAtMs = new Date(expiresAtIso).getTime();
  const mintedAtMs = expiresAtMs - verificationExpiryHours * 60 * 60 * 1000;
  const isLive = expiresAtMs > now;

  return isLive && now - mintedAtMs < reuseWindowMs;
};