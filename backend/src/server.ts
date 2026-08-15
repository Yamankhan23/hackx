import "dotenv/config";
import app from "./app";

// Fail fast on boot rather than discovering a missing env var later as a
// silently-broken CORS origin, an email link pointing at "undefined", or an
// unsigned JWT — all of which "work" locally and only break in production.
const REQUIRED_ENV_VARS = ["DATABASE_URL", "FRONTEND_URL", "JWT_SECRET", "RESEND_API_KEY", "EMAIL_FROM"];
const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required environment variable(s): ${missing.join(", ")}`);
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`MUSA CodeX API running on port ${PORT}`);
});