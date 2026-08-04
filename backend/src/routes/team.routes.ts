import { Router } from "express";
import {
  continueApplicationController,
  registerTeamController,
  resumeApplicationController,
  sendVerificationEmailsController,
  updateTeamController,
} from "../controllers/team.controller";

const router = Router();

router.post("/register", registerTeamController);
router.post("/continue", continueApplicationController);
router.get("/resume/:token", resumeApplicationController);
router.put("/:teamId", updateTeamController);
router.post(
  "/:teamId/send-verification",
  sendVerificationEmailsController
);

export default router;
