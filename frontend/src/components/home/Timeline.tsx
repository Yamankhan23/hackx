import { SectionHeading } from "./SectionHeading";
import { useInView } from "./useInView";
import { useToast } from "../../hooks/useToast";
import { cn } from "../../lib/utils";
import { REGISTRATION_CLOSES_AT } from "../../lib/constants";

type Step = {
  phase: string;
  title: string;
  // ISO timestamps with the +05:30 (IST) offset baked in — the event runs on
  // IST regardless of a visitor's own timezone, so these are compared and
  // displayed in IST explicitly rather than the browser's local time.
  startAt: string;
  endAt?: string;
  note?: string;
  desc: string;
  highlight?: boolean;
  locationUrl?: string;
};

// NOTE: Round 1/Round 2/Top 15/Finale times below are placeholders (default
// 9:00 AM starts) — swap in the real hour-level cutoffs once confirmed;
// everything else (locking, formatting) already works off these fields.
const steps: Step[] = [
  {
    phase: "Phase 01",
    title: "Registration",
    startAt: "2026-08-24T00:00:00+05:30",
    endAt: REGISTRATION_CLOSES_AT,
    note: "Closes at 3:00 PM, 18 September 2026",
    desc: "Register your team and pick your domain to lock in your spot.",
  },
  {
    phase: "Phase 02",
    title: "Round 1",
    startAt: "2026-09-16T09:00:00+05:30",
    endAt: "2026-09-17T23:59:00+05:30",
    desc: "First online round: submit your initial idea and approach.",
  },
  {
    phase: "Phase 03",
    title: "Round 2",
    startAt: "2026-09-22T09:00:00+05:30",
    desc: "Second online round: refine and present your solution.",
  },
  {
    phase: "Phase 04",
    title: "Top 15",
    startAt: "2026-09-24T09:00:00+05:30",
    desc: "The strongest 15 teams qualify for the grand finale.",
  },
  {
    phase: "Phase 05",
    title: "Grand Finale",
    startAt: "2026-09-27T09:00:00+05:30",
    desc: "Offline finale in Mumbai: build live and compete for the crown.",
    highlight: true,
    locationUrl: "https://maps.app.goo.gl/SCeVjxNwF9wK9DEH9",
  },
];

type StepStatus = "completed" | "active" | "locked";

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function formatIst(iso: string): string {
  return `${dateTimeFormatter.format(new Date(iso))} IST`;
}

function formatRange(startAt: string, endAt?: string): string {
  return endAt ? `${formatIst(startAt)} → ${formatIst(endAt)}` : formatIst(startAt);
}

function getStatus(step: Step, now: Date): StepStatus {
  const start = new Date(step.startAt);
  const end = step.endAt ? new Date(step.endAt) : null;

  if (now < start) return "locked";
  if (end && now > end) return "completed";
  return "active";
}

const STATUS_LABEL: Record<StepStatus, string> = {
  completed: "Completed",
  active: "In Progress",
  locked: "Locked",
};

const STATUS_BADGE_CLASS: Record<StepStatus, string> = {
  completed: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  active: "border-purple-400/40 bg-purple-500/15 text-purple-200",
  locked: "border-white/10 bg-white/5 text-white/40",
};

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3 w-3">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
    </svg>
  );
}

export function Timeline() {
  const { ref, inView } = useInView<HTMLDivElement>();
  const toast = useToast();
  const now = new Date();
  const activeStep = steps.find((step) => getStatus(step, now) === "active");

  const handleLockedClick = (step: Step) => {
    toast.info(
      activeStep
        ? `${activeStep.title} is currently in progress. ${step.title} unlocks once it ends.`
        : `${step.title} hasn't started yet. Check back closer to ${formatIst(step.startAt)}.`
    );
  };

  return (
    <section id="timeline" className="relative scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="How It Works"
          title={
            <>
              Your journey to the{" "}
              <span className="text-gradient">Grand Finale</span>
            </>
          }
          subtitle="Registration → Round 1 → Round 2 → Top 15 → Grand Finale"
        />

        <div
          ref={ref}
          className={cn(
            "reveal relative mt-14",
            inView && "reveal-visible"
          )}
        >
          {/* connecting line */}
          <div className="absolute left-5 top-0 h-full w-px bg-gradient-to-b from-purple-500/60 via-blue-500/40 to-purple-500/60 lg:left-1/2 lg:-translate-x-1/2" />

          <div className="space-y-8">
            {steps.map((step, i) => {
              const isLeft = i % 2 === 0;
              const status = getStatus(step, now);
              const locked = status === "locked";

              return (
                <div
                  key={step.title}
                  className={cn(
                    "relative flex items-start gap-5 lg:gap-0",
                    isLeft ? "lg:flex-row" : "lg:flex-row-reverse"
                  )}
                >
                  {/* node */}
                  <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-purple-400/40 bg-[#081029] lg:absolute lg:left-1/2 lg:-translate-x-1/2">
                    {locked ? (
                      <span className="text-white/40">
                        <LockIcon />
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "h-2.5 w-2.5 rounded-full",
                          step.highlight
                            ? "bg-gradient-to-r from-purple-400 to-blue-400 shadow-[0_0_12px_rgba(168,85,247,0.8)]"
                            : status === "active"
                              ? "bg-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.7)]"
                              : "bg-emerald-400/80"
                        )}
                      />
                    )}
                  </div>

                  {/* card */}
                  <div
                    onClick={locked ? () => handleLockedClick(step) : undefined}
                    role={locked ? "button" : undefined}
                    tabIndex={locked ? 0 : undefined}
                    onKeyDown={
                      locked
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") handleLockedClick(step);
                          }
                        : undefined
                    }
                    className={cn(
                      "ml-14 w-full rounded-2xl border bg-white/[0.04] p-5 backdrop-blur transition lg:ml-0 lg:w-[calc(50%-2.5rem)]",
                      locked
                        ? "cursor-pointer border-white/10 opacity-60 hover:opacity-80"
                        : "hover:border-purple-400/30",
                      !locked && step.highlight
                        ? "border-purple-400/40 shadow-[0_20px_60px_rgba(91,33,182,0.2)]"
                        : !locked
                          ? "border-white/10"
                          : "",
                      isLeft ? "lg:mr-auto lg:text-right" : "lg:ml-auto"
                    )}
                  >
                    <div className={cn("flex items-center gap-2", isLeft ? "lg:justify-end" : "")}>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-purple-300/80">
                        {step.phase}
                      </p>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                          STATUS_BADGE_CLASS[status]
                        )}
                      >
                        {locked ? <LockIcon /> : null}
                        {STATUS_LABEL[status]}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-lg font-semibold text-white">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-purple-200/90">
                      {formatRange(step.startAt, step.endAt)}
                    </p>
                    {step.note ? (
                      <p className="mt-1 text-xs text-amber-300/80">
                        {step.note}
                      </p>
                    ) : null}
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">
                      {step.desc}
                    </p>
                    {step.locationUrl && !locked ? (
                      <a
                        href={step.locationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-purple-300 underline-offset-4 hover:text-purple-200 hover:underline"
                      >
                        View venue on Google Maps
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
