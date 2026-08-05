import { SectionHeading } from "./SectionHeading";
import { useInView } from "./useInView";
import { cn } from "../../lib/utils";

const prizes = [
  {
    place: "1st Place",
    prize: "₹25,000",
    detail: "Cash Prize",
    trophy: true,
    feature: true,
    accent: "from-amber-400/20 to-yellow-500/0",
    border: "border-amber-400/40",
    badge: "Champion",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-8 w-8">
        <path d="M8 21h8m-4-4v4M7 4h10v7a5 5 0 0 1-10 0V4z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 6H4a2 2 0 0 0 2 4h1m10 0h1a2 2 0 0 0 2-4h-3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    place: "2nd Place",
    prize: "To Be Announced",
    detail: "Trophy + Cash Prize",
    trophy: true,
    feature: false,
    accent: "from-slate-300/20 to-slate-400/0",
    border: "border-slate-300/30",
    badge: "Runner-up",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-8 w-8">
        <path d="M7 4h10v10a5 5 0 0 1-10 0V4z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 6H4a2 2 0 0 0 2 4h1m10 0h1a2 2 0 0 0 2-4h-3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    place: "3rd Place",
    prize: "To Be Announced",
    detail: "Trophy + Cash Prize",
    trophy: true,
    feature: false,
    accent: "from-orange-400/20 to-orange-500/0",
    border: "border-orange-400/30",
    badge: "Runner-up",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-8 w-8">
        <path d="M7 4h10v10a5 5 0 0 1-10 0V4z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 6H4a2 2 0 0 0 2 4h1m10 0h1a2 2 0 0 0 2-4h-3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function Prizes() {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <section id="prizes" className="relative scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Prize Pool"
          title={
            <>
              Win big. <span className="text-gradient">Earn glory.</span>
            </>
          }
          subtitle="The top teams walk away with trophies, cash prizes, and recognition."
        />

        <div
          ref={ref}
          className={cn(
            "reveal mt-12 grid grid-cols-1 gap-5 md:grid-cols-3",
            inView && "reveal-visible"
          )}
        >
          {prizes.map((prize) => (
            <div
              key={prize.place}
              className={cn(
                "group relative overflow-hidden rounded-3xl border bg-white/[0.04] p-8 text-center backdrop-blur transition duration-300 hover:-translate-y-1.5",
                prize.border,
                prize.feature
                  ? "shadow-[0_30px_80px_rgba(245,198,80,0.15)] md:-mt-4 md:mb-4"
                  : "hover:border-white/25"
              )}
            >
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 bg-gradient-to-b opacity-70",
                  prize.accent
                )}
              />
              {prize.feature ? (
                <div className="absolute left-1/2 top-0 -translate-x-1/2 rounded-b-xl bg-gradient-to-r from-amber-400 to-yellow-300 px-4 py-1 text-xs font-bold uppercase tracking-wider text-amber-950">
                  {prize.badge}
                </div>
              ) : null}

              <div className="relative">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600/30 to-blue-600/30 text-purple-100 ring-1 ring-purple-400/30">
                  {prize.icon}
                </div>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                  {prize.place}
                </p>
                <p className="mt-3 text-3xl font-black text-white sm:text-4xl">
                  {prize.prize}
                </p>
                <p className="mt-2 text-sm text-slate-300">{prize.detail}</p>
                {prize.trophy ? (
                  <p className="mt-1 text-xs text-slate-500">+ Trophy</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div
          className="reveal mx-auto mt-8 max-w-2xl rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-center backdrop-blur"
        >
          <p className="text-sm text-slate-300">
            🎖️ Every participant receives an{" "}
            <span className="font-semibold text-white">
              official participation certificate
            </span>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
