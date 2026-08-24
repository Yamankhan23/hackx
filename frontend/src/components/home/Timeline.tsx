import { SectionHeading } from "./SectionHeading";
import { useInView } from "./useInView";
import { cn } from "../../lib/utils";

const steps = [
  {
    phase: "Phase 01",
    title: "Registration",
    date: "Opens 22 August 2026",
    note: "Closes before Round 1 begins",
    desc: "Register your team and pick your domain to lock in your spot.",
  },
  {
    phase: "Phase 02",
    title: "Round 1",
    date: "16 September 2026",
    desc: "First online round — submit your initial idea and approach.",
  },
  {
    phase: "Phase 03",
    title: "Round 2",
    date: "22 September 2026",
    desc: "Second online round — refine and present your solution.",
  },
  {
    phase: "Phase 04",
    title: "Top 15",
    date: "Selection",
    desc: "The strongest 15 teams qualify for the grand finale.",
  },
  {
    phase: "Phase 05",
    title: "Grand Finale",
    date: "27 September 2026",
    desc: "Offline finale in Mumbai — build live and compete for the crown.",
    highlight: true,
  },
];

export function Timeline() {
  const { ref, inView } = useInView<HTMLDivElement>();

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
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        step.highlight
                          ? "bg-gradient-to-r from-purple-400 to-blue-400 shadow-[0_0_12px_rgba(168,85,247,0.8)]"
                          : "bg-purple-400/70"
                      )}
                    />
                  </div>

                  {/* card */}
                  <div
                    className={cn(
                      "ml-14 w-full rounded-2xl border bg-white/[0.04] p-5 backdrop-blur transition hover:border-purple-400/30 lg:ml-0 lg:w-[calc(50%-2.5rem)]",
                      step.highlight
                        ? "border-purple-400/40 shadow-[0_20px_60px_rgba(91,33,182,0.2)]"
                        : "border-white/10",
                      isLeft ? "lg:mr-auto lg:text-right" : "lg:ml-auto"
                    )}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-purple-300/80">
                      {step.phase}
                    </p>
                    <h3 className="mt-1.5 text-lg font-semibold text-white">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-purple-200/90">
                      {step.date}
                    </p>
                    {step.note ? (
                      <p className="mt-1 text-xs text-amber-300/80">
                        {step.note}
                      </p>
                    ) : null}
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">
                      {step.desc}
                    </p>
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
