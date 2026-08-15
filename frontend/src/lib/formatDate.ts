// All timestamps are stored in UTC and rendered in the event's local timezone
// (IST) so admins see a single consistent time everywhere in the dashboard.
const TIME_ZONE = "Asia/Kolkata";

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function parse(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** e.g. "Today, 11:42 PM" · "Yesterday, 6:05 AM" · "15 Aug 2026, 11:42 PM" */
export function formatDateTime(value: string | null | undefined): string {
  const date = parse(value);
  if (!date) return "—";

  const now = new Date();
  const time = timeFormatter.format(date);
  const dayKey = dayKeyFormatter.format(date);

  if (dayKey === dayKeyFormatter.format(now)) return `Today, ${time}`;
  if (dayKey === dayKeyFormatter.format(new Date(now.getTime() - ONE_DAY_MS))) return `Yesterday, ${time}`;
  return `${dateFormatter.format(date)}, ${time}`;
}

/** e.g. "15 Aug 2026" — date only, no time-of-day. */
export function formatDate(value: string | null | undefined): string {
  const date = parse(value);
  return date ? dateFormatter.format(date) : "—";
}
