import { Router } from "express";
import { registerTeamController } from "../controllers/team.controller";

const router = Router();

router.post("/register", registerTeamController);

export default router;