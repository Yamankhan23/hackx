// Mirrors backend/src/lib/constants.ts REGISTRATION_CLOSES_AT. The backend
// is the real gate on new submissions — this only lets the UI show a closed
// state up front instead of a dead-end error after filling the whole form.
export const REGISTRATION_CLOSES_AT = "2026-09-18T15:00:00+05:30";

// Mirrors backend/src/lib/constants.ts APPLICATION_CLOSES_AT. Gates new
// resume-link requests, editing, and PPT upload/delete — not loading a
// draft or payment, which admin-issued round 2 links still rely on. The
// backend is the real gate, this only avoids a dead-end error in the UI.
export const APPLICATION_CLOSES_AT = "2026-09-18T00:00:00+05:30";

export const isApplicationClosed = () =>
  Date.now() >= new Date(APPLICATION_CLOSES_AT).getTime();
