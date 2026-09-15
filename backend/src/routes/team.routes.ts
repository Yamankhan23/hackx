import { Router } from "express";
import multer from "multer";
import {
  confirmRegistrationController,
  continueApplicationController,
  registerTeamController,
  resendVerificationEmailController,
  resumeApplicationController,
  updateTeamController,
  uploadTeamPptController,
  verifyEmailController,
} from "../controllers/team.controller";
import {
  createPaymentOrderController,
  verifyPaymentController,
} from "../controllers/payment.controller";
import { publicTeamLimiter } from "../lib/rate-limit";
import { pptUpload } from "../middleware/upload.middleware";

const router = Router();

// multer reports file-type/size problems via a callback error rather than
// throwing into the route chain — translated here into the same
// { success, message } shape every other endpoint responds with, instead of
// falling through to app.ts's generic 500 handler.
const handlePptUpload = (
  req: Parameters<ReturnType<typeof pptUpload.single>>[0],
  res: Parameters<ReturnType<typeof pptUpload.single>>[1],
  next: Parameters<ReturnType<typeof pptUpload.single>>[2]
) => {
  pptUpload.single("ppt")(req, res, (err: unknown) => {
    if (err) {
      const message =
        err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
          ? "File is too large. Maximum size is 35MB."
          : err instanceof Error
            ? err.message
            : "Failed to process the uploaded file.";

      return res.status(400).json({ success: false, message });
    }
    next();
  });
};

router.post("/register", publicTeamLimiter, registerTeamController);
router.get("/confirm/:token", publicTeamLimiter, confirmRegistrationController);
router.get("/verify-email", verifyEmailController);
router.post("/resend-verification", publicTeamLimiter, resendVerificationEmailController);
router.post("/continue", publicTeamLimiter, continueApplicationController);
router.get("/resume/:token", publicTeamLimiter, resumeApplicationController);
router.put("/resume/:token", publicTeamLimiter, updateTeamController);
router.post(
  "/resume/:token/ppt",
  publicTeamLimiter,
  handlePptUpload,
  uploadTeamPptController
);

router.post("/payment/order", publicTeamLimiter, createPaymentOrderController);
router.post("/payment/verify", publicTeamLimiter, verifyPaymentController);
// Note: the webhook route itself is mounted separately in app.ts (needs the
// raw request body for signature verification, ahead of express.json()).

export default router;
