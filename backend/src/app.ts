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
import { httpLogger } from "./lib/http-logger";
import { corsOptions } from "./lib/cors";

const app = express();

// Render (and most PaaS platforms) put the app behind exactly one reverse
// proxy hop, which sets X-Forwarded-For. Without this, Express ignores that
// header (req.ip is always the proxy's own IP) and express-rate-limit can't
// tell users apart — trusting exactly 1 hop fixes both without blindly
// trusting an arbitrary client-supplied header chain.
app.set("trust proxy", 1);

// Logs every request as it finishes (method, url, status, latency, request
// id) — placed first so it wraps every route, including the raw-body
// webhook below.
app.use(httpLogger);

app.use(helmet());

// Allow-lists FRONTEND_URL (validated as present at boot, see server.ts)
// plus any origins in ADDITIONAL_CORS_ORIGINS — see lib/cors.ts.
app.use(cors(corsOptions));

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
    req.log.error({ err }, `Unhandled error on ${req.method} ${req.originalUrl}`);
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
);

export default app;
