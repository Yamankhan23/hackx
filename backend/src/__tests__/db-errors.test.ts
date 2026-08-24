import { describe, expect, it } from "vitest";
import { friendlyDbErrorMessage } from "../lib/db-errors";

type PgError = Error & { code?: string; constraint?: string };

const pgError = (code: string, constraint?: string): PgError => {
  const err = new Error("duplicate key value violates unique constraint") as PgError;
  err.code = code;
  err.constraint = constraint;
  return err;
};

describe("friendlyDbErrorMessage", () => {
  it("maps a known unique-violation constraint to a friendly message", () => {
    // Simulates two concurrent registrations racing on the same member email.
    expect(friendlyDbErrorMessage(pgError("23505", "team_members_email_unique"))).toBe(
      "One or more team member emails are already registered."
    );
  });

  it("maps the payments unique constraint (double payment-order creation)", () => {
    expect(friendlyDbErrorMessage(pgError("23505", "payments_team_id_key"))).toBe(
      "A payment record already exists for this team."
    );
  });

  it("falls back to a generic message for an unmapped unique constraint", () => {
    expect(friendlyDbErrorMessage(pgError("23505", "some_future_constraint"))).toBe(
      "This record already exists."
    );
  });

  it("maps foreign-key violations to a generic message", () => {
    expect(friendlyDbErrorMessage(pgError("23503"))).toBe(
      "This action references a record that no longer exists."
    );
  });

  it("returns null for non-Postgres errors so callers can fall back to their own message", () => {
    expect(friendlyDbErrorMessage(new Error("boom"))).toBeNull();
    expect(friendlyDbErrorMessage("not an error")).toBeNull();
  });

  it("uses the provided fallback for an unrecognized Postgres error code", () => {
    expect(friendlyDbErrorMessage(pgError("55000"), "custom fallback")).toBe("custom fallback");
  });
});
