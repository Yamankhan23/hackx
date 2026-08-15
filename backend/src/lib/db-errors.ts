type PgError = Error & { code?: string; constraint?: string };

const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";

const CONSTRAINT_MESSAGES: Record<string, string> = {
  teams_team_name_key: "This team name is already taken. Please choose another.",
  teams_team_id_key: "This team ID is already in use. Please try again.",
  teams_registration_id_key: "This registration ID is already in use. Please try again.",
  team_members_email_unique:
    "One or more team member emails are already registered.",
  colleges_name_unique: "A college with this name already exists.",
  colleges_college_id_key: "A college with this ID already exists.",
  domains_name_key: "A domain with this name already exists.",
  admins_email_key: "An admin with this email already exists.",
  payments_team_id_key: "A payment record already exists for this team.",
};

const isPgError = (error: unknown): error is PgError =>
  error instanceof Error && typeof (error as PgError).code === "string";

/**
 * Maps known Postgres constraint-violation errors to user-friendly messages.
 * Falls back to a generic message rather than leaking raw driver error text
 * (e.g. `duplicate key value violates unique constraint "..."`) to clients.
 */
export const friendlyDbErrorMessage = (
  error: unknown,
  fallback = "Something went wrong while saving your data. Please try again."
): string | null => {
  if (!isPgError(error)) {
    return null;
  }

  if (error.code === UNIQUE_VIOLATION) {
    if (error.constraint && CONSTRAINT_MESSAGES[error.constraint]) {
      return CONSTRAINT_MESSAGES[error.constraint];
    }
    return "This record already exists.";
  }

  if (error.code === FOREIGN_KEY_VIOLATION) {
    return "This action references a record that no longer exists.";
  }

  return fallback;
};
