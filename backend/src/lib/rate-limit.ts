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
//
// Kept generous on purpose: many legitimate teams can share one public IP
// (college WiFi/NAT, a hostel router) and hit register/confirm/resume/payment
// in the same 15-minute window during a launch-day spike — a strict limit
// here would block real users, not abusers. Configurable via env in case it
// needs tuning without a redeploy.
export const publicTeamLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.PUBLIC_TEAM_RATE_LIMIT ?? 100),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again in a few minutes.",
  },
});
