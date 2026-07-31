import { Router } from "express";
import {
  registerTeamController,
  sendVerificationEmailsController,
} from "../controllers/team.controller";

const router = Router();

router.post("/register", registerTeamController);
router.post(
  "/:teamId/send-verification",
  sendVerificationEmailsController
);

export default router;