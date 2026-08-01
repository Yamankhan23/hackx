import { Router } from "express";
import {
  adminLogin,
  createCollege,
  createDomain,
  createProblemStatement,
  createRound,
  getCollegesAdmin,
  getDashboard,
  getDomainsAdmin,
  getParticipantById,
  getParticipants,
  getPaymentById,
  getPayments,
  getProblemStatementsAdmin,
  getRoundsAdmin,
  getTeamById,
  getTeams,
  publishProblemStatement,
  toggleCollegeStatus,
  toggleDomainStatus,
  toggleRoundStatus,
  updateCollege,
  updateDomain,
  updateProblemStatement,
  updateRound,
} from "../controllers/admin.controller";
import { requireAdminAuth } from "../middleware/admin-auth.middleware";

const router = Router();

router.post("/login", adminLogin);
router.use(requireAdminAuth);

router.get("/dashboard", getDashboard);
router.get("/teams", getTeams);
router.get("/teams/:teamId", getTeamById);
router.get("/participants", getParticipants);
router.get("/participants/:id", getParticipantById);
router.get("/payments", getPayments);
router.get("/payments/:id", getPaymentById);
router.get("/domains", getDomainsAdmin);
router.post("/domains", createDomain);
router.put("/domains/:id", updateDomain);
router.patch("/domains/:id/status", toggleDomainStatus);
router.get("/colleges", getCollegesAdmin);
router.post("/colleges", createCollege);
router.put("/colleges/:id", updateCollege);
router.patch("/colleges/:id/status", toggleCollegeStatus);
router.get("/rounds", getRoundsAdmin);
router.post("/rounds", createRound);
router.put("/rounds/:id", updateRound);
router.patch("/rounds/:id/status", toggleRoundStatus);
router.get("/problem-statements", getProblemStatementsAdmin);
router.post("/problem-statements", createProblemStatement);
router.put("/problem-statements/:id", updateProblemStatement);
router.patch("/problem-statements/:id/publish", publishProblemStatement);

export default router;
