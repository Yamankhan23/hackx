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

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
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
export default app;
