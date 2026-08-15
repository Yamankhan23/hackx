import express from "express";
import cors from "cors";
import helmet from "helmet";

import healthRoutes from "./routes/health.routes";
import teamRoutes from "./routes/team.routes";
import domainRoutes from "./routes/domain.routes";
import collegeRoutes from "./routes/college.routes";
import adminRoutes from "./routes/admin.routes";
import { razorpayWebhookController } from "./controllers/payment.controller";
import { globalLimiter } from "./lib/rate-limit";

const app = express();

app.use(helmet());

// FRONTEND_URL is validated as present at boot (see server.ts) — no
// same-origin-as-dev fallback here, since that would silently reject the
// real deployed frontend if the env var were ever missing in production.
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
  })
);

// Mounted before express.json() — Razorpay webhook signatures must be
// verified against the exact raw request body, not the re-serialized JSON.
app.post(
  "/api/teams/payment/webhook",
  express.raw({ type: "application/json" }),
  razorpayWebhookController
);

// Webhook is mounted above this, so it's exempt — Razorpay's own signature
// check secures it, and it's server-to-server rather than per-visitor traffic.
app.use(globalLimiter);

app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;

    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`
    );

    if (res.statusCode >= 400) {
      console.error(
        `Request failed: ${req.method} ${req.originalUrl}`
      );
    }
  });

  next();
});

app.use("/api/health", healthRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/domains", domainRoutes);
app.use("/api/colleges", collegeRoutes);
app.use("/api/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Not found" });
});

// Final safety net: any error a route handler forgets to catch lands here
// instead of Express's default HTML/stack-trace response.
app.use(
  (err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) return next(err);
    console.error(`Unhandled error on ${req.method} ${req.originalUrl}:`, err);
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
);

export default app;
