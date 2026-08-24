import type { CorsOptions } from "cors";
import { logger } from "./logger";

// Strip a trailing slash so a stray "https://example.com/" in an env var
// doesn't silently fail to match the "https://example.com" a browser
// actually sends as the Origin header.
const normalizeOrigin = (origin: string) => origin.trim().replace(/\/+$/, "");

// FRONTEND_URL is the canonical origin (also used to build links in emails,
// validated as present at boot in server.ts). ADDITIONAL_CORS_ORIGINS
// covers any other origin that legitimately calls this API — a custom
// domain alongside the Render URL, a staging frontend, an admin dashboard
// on its own subdomain — as a comma-separated list, so adding one doesn't
// require a code change.
const allowedOrigins = new Set(
  [process.env.FRONTEND_URL, ...(process.env.ADDITIONAL_CORS_ORIGINS ?? "").split(",")]
    .map((origin) => origin?.trim())
    .filter((origin): origin is string => Boolean(origin))
    .map(normalizeOrigin)
);

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // No Origin header covers same-origin requests, curl/Postman, the
    // Razorpay webhook, and Render's own health checks — none of these are
    // governed by CORS in the first place (it's a browser-only mechanism),
    // so there's nothing to allow-list here.
    if (!origin || allowedOrigins.has(normalizeOrigin(origin))) {
      callback(null, true);
      return;
    }

    // Reject WITHOUT throwing: passing an Error here would route through
    // Express's generic error handler and get logged as a scary 500 for
    // what's usually just a bot/scanner probing with a random Origin header.
    // Omitting the CORS headers is enough — the browser blocks the response
    // either way, and non-browser clients were never subject to this check
    // to begin with. Real access control here is the JWT/token auth on each
    // route, never this origin check.
    logger.warn({ origin }, "Blocked cross-origin request from a non-allow-listed origin");
    callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
