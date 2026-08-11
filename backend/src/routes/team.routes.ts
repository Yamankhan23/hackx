import { Router } from "express";
import {
  registerTeamController,
  sendVerificationEmailsController,
  verifyEmailController,
} from "../controllers/team.controller";

const router = Router();

router.post("/register", registerTeamController);
router.get("/verify-email", verifyEmailController);
router.post(
  "/:teamId/send-verification",
  sendVerificationEmailsController
);

export default router;