import { Router } from "express";
import { getPublishedProblemStatements } from "../controllers/problem-statement.controller";

const router = Router();

router.get("/", getPublishedProblemStatements);

export default router;
