import { SectionHeading } from "./SectionHeading";
import { useInView } from "./useInView";
import { cn } from "../../lib/utils";

export function ProblemStatements() {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <section id="problems" className="relative scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Problem Statements"
          title={
            <>
              The challenges are{" "}
              <span className="text-gradient">coming soon</span>
            </>
          }
          subtitle="Detailed problem statements across all domains will be revealed soon."
        />

        <div
          ref={ref}
          className={cn(
            "reveal mx-auto mt-12 max-w-3xl",
            inView && "reveal-visible"
          )}
        >
          <div className="relative overflow-hidden rounded-3xl border border-dashed border-purple-400/30 bg-gradient-to-b from-purple-500/10 to-transparent p-10 text-center sm:p-14">
            <div className="pointer-events-none absolute -top-16 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-purple-600/20 blur-[80px]" />
            <div className="relative">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600/30 to-blue-600/30 text-purple-100 ring-1 ring-purple-400/30">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-8 w-8">
                  <path d="M12 14v3m0-9h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="mt-6 text-2xl font-bold text-white sm:text-3xl">
                Coming Soon
              </h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400 sm:text-base">
                We&apos;re crafting real-world problems across all ten domains.
                Stay tuned — they&apos;ll be announced right here before the
                competition begins.
              </p>
              <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-1.5 text-xs font-medium text-purple-100">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400" />
                To Be Announced
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
