type Tone = "success" | "warning" | "danger" | "info" | "neutral";

const toneClasses: Record<Tone, string> = {
  success: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  warning: "border-amber-400/30 bg-amber-500/10 text-amber-300",
  danger: "border-red-400/30 bg-red-500/10 text-red-300",
  info: "border-blue-400/30 bg-blue-500/10 text-blue-300",
  neutral: "border-slate-500/30 bg-slate-500/10 text-slate-300",
};

const STATUS_TONE: Record<string, Tone> = {
  CONFIRMED: "success",
  SUCCESS: "success",
  ACTIVE: "success",
  COMPLETED: "success",
  VERIFIED: "success",
  PUBLISHED: "success",
  DRAFT: "neutral",
  UPCOMING: "neutral",
  UNPUBLISHED: "neutral",
  INACTIVE: "neutral",
  PENDING: "warning",
  PENDING_PAYMENT: "warning",
  CREATED: "warning",
  UNVERIFIED: "warning",
  CANCELLED: "danger",
  FAILED: "danger",
  REFUNDED: "info",
};

const LABEL_OVERRIDES: Record<string, string> = {
  PENDING_PAYMENT: "Pending payment",
  CREATED: "Pending",
  SUCCESS: "Paid",
};

export function StatusBadge({ status, size = "md" }: { status: string; size?: "sm" | "md" }) {
  const key = status.toUpperCase();
  const tone = STATUS_TONE[key] ?? "neutral";
  const label = LABEL_OVERRIDES[key] ?? status.replaceAll("_", " ").toLowerCase();

  return (
    <span
      className={[
        "inline-flex items-center whitespace-nowrap rounded-full border font-medium capitalize tracking-wide",
        toneClasses[tone],
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
      ].join(" ")}
    >
      {label}
    </span>
  );
}
