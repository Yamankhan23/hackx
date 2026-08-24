import "dotenv/config";
import app from "./app";
import { logger } from "./lib/logger";
import { startEmailQueueWorker } from "./services/email-queue.service";

// Fail fast on boot rather than discovering a missing env var later as a
// silently-broken CORS origin, an email link pointing at "undefined", or an
// unsigned JWT — all of which "work" locally and only break in production.
const REQUIRED_ENV_VARS = ["DATABASE_URL", "FRONTEND_URL", "JWT_SECRET", "RESEND_API_KEY", "EMAIL_FROM"];
const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

if (missing.length > 0) {
  logger.error(`Missing required environment variable(s): ${missing.join(", ")}`);
  process.exit(1);
}

// Surface crashes that never make it through Express's error handler (e.g.
// a rejected promise with no .catch anywhere) instead of losing them to a
// silent process exit or an unformatted stack trace on stderr.
process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection");
});

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception");
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info(`MUSA CodeX API running on port ${PORT}`);
  startEmailQueueWorker();
});

// Guards against a slow/stalled client socket holding a connection (and its
// memory) open indefinitely during a traffic spike. keepAliveTimeout <
// headersTimeout is required by Node so the header-parsing timeout never
// fires before the keep-alive one.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;
server.requestTimeout = 30_000;