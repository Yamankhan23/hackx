import { Request, Response } from "express";
import { and, asc, eq } from "drizzle-orm";
import { db } from "../db";
import { domains, problemStatements } from "../db/migrations/schema";

export const getPublishedProblemStatements = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    // Inner join on domainId: a problem statement with no domain (or one
    // pointing at a deactivated domain) is excluded rather than shown under
    // the wrong section, so grouping by domain is always exact.
    const data = await db
      .select({
        id: problemStatements.id,
        problemStatementId: problemStatements.problemStatementId,
        title: problemStatements.title,
        description: problemStatements.description,
        domainId: domains.id,
        domainName: domains.name,
      })
      .from(problemStatements)
      .innerJoin(domains, eq(domains.id, problemStatements.domainId))
      .where(and(eq(problemStatements.isPublished, true), eq(domains.isActive, true)))
      .orderBy(asc(domains.id), asc(problemStatements.problemStatementId));

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    _req.log.error({ err: error }, "Error fetching problem statements");

    res.status(500).json({
      success: false,
      message: "Failed to fetch problem statements",
    });
  }
};
