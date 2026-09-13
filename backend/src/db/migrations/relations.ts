import { relations } from "drizzle-orm/relations";
import { domains, problemStatements, teams, colleges, teamMembers, payments, pptSubmissions } from "./schema";

export const problemStatementsRelations = relations(problemStatements, ({one}) => ({
	domain: one(domains, {
		fields: [problemStatements.domainId],
		references: [domains.id]
	}),
}));

export const domainsRelations = relations(domains, ({many}) => ({
	problemStatements: many(problemStatements),
	teams: many(teams),
}));

export const teamsRelations = relations(teams, ({one, many}) => ({
	domain: one(domains, {
		fields: [teams.domainId],
		references: [domains.id]
	}),
	teamMembers: many(teamMembers),
	payments: many(payments),
	pptSubmission: one(pptSubmissions),
}));

export const teamMembersRelations = relations(teamMembers, ({one, many}) => ({
	college: one(colleges, {
		fields: [teamMembers.collegeId],
		references: [colleges.id]
	}),
	team: one(teams, {
		fields: [teamMembers.teamId],
		references: [teams.id]
	}),
	pptSubmissions: many(pptSubmissions),
}));

export const pptSubmissionsRelations = relations(pptSubmissions, ({one}) => ({
	team: one(teams, {
		fields: [pptSubmissions.teamId],
		references: [teams.id]
	}),
	uploadedByMember: one(teamMembers, {
		fields: [pptSubmissions.uploadedByMemberId],
		references: [teamMembers.id]
	}),
}));

export const collegesRelations = relations(colleges, ({many}) => ({
	teamMembers: many(teamMembers),
}));

export const paymentsRelations = relations(payments, ({one}) => ({
	team: one(teams, {
		fields: [payments.teamId],
		references: [teams.id]
	}),
}));