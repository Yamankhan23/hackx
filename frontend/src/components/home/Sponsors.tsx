import { SectionHeading } from "./SectionHeading";
import { useInView } from "./useInView";
import { cn } from "../../lib/utils";

// TODO: paste the "Become a Sponsor" Google Form link here once it's ready.
const SPONSOR_FORM_URL = "#";

export function Sponsors() {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <section id="sponsors" className="relative scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Sponsors & Partners"
          title={
            <>
              Powered by <span className="text-gradient">great partners</span>
            </>
          }
          subtitle="Brands and organisations that make MUSA CodeX possible."
        />

        <div
          ref={ref}
          className={cn(
            "reveal mx-auto mt-12 max-w-3xl",
            inView && "reveal-visible"
          )}
        >
          <div className="relative overflow-hidden rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-10 text-center sm:p-14">
            <div className="pointer-events-none absolute inset-0 grid grid-cols-3 gap-4 p-6 opacity-40 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02]"
                >
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-600">
                    Logo
                  </span>
                </div>
              ))}
            </div>
            <div className="relative">
              <p className="text-xl font-bold text-white sm:text-2xl">
                Sponsors Coming Soon
              </p>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">
                We&apos;re partnering with forward-thinking brands to power the
                next generation of builders. Stay tuned.
              </p>
              <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-1.5 text-xs font-medium text-purple-100">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400" />
                To Be Announced
              </span>

              <div className="mt-6">
                <a
                  href={SPONSOR_FORM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-6 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(91,33,182,0.35)] transition hover:brightness-110"
                >
                  Become a Sponsor
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
