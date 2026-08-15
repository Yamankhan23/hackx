import { Router } from "express";
import {
  continueApplicationController,
  registerTeamController,
  resendVerificationEmailController,
  resumeApplicationController,
  updateTeamController,
  verifyEmailController,
} from "../controllers/team.controller";
import {
  createPaymentOrderController,
  verifyPaymentController,
} from "../controllers/payment.controller";
import { publicTeamLimiter } from "../lib/rate-limit";

const router = Router();

router.post("/register", publicTeamLimiter, registerTeamController);
router.get("/verify-email", verifyEmailController);
router.post("/resend-verification", publicTeamLimiter, resendVerificationEmailController);
router.post("/continue", publicTeamLimiter, continueApplicationController);
router.get("/resume/:token", publicTeamLimiter, resumeApplicationController);
router.put("/resume/:token", publicTeamLimiter, updateTeamController);

router.post("/payment/order", publicTeamLimiter, createPaymentOrderController);
router.post("/payment/verify", publicTeamLimiter, verifyPaymentController);
// Note: the webhook route itself is mounted separately in app.ts (needs the
// raw request body for signature verification, ahead of express.json()).

export default router;
