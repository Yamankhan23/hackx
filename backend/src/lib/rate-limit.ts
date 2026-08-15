import rateLimit from "express-rate-limit";

// Baseline cap applied to every request (health check, public domain/college
// lookups, authenticated admin GETs, etc.) as defense-in-depth. Generous
// enough not to bother real usage; the tighter limiters below layer stricter
// caps on top of this for specific sensitive endpoints.
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again in a few minutes.",
  },
});

// Brute-force protection for admin login.
export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again in a few minutes.",
  },
});

// Applied to public team endpoints that trigger emails or accept tokens
// (register, continue/resend, resume, payment) to blunt spam/abuse.
export const publicTeamLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again in a few minutes.",
  },
});
