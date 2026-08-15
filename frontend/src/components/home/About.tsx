import { useInView } from "./useInView";
import { SectionHeading } from "./SectionHeading";
import { cn } from "../../lib/utils";

const highlights = [
  {
    value: "2",
    label: "Online Rounds",
    sub: "Advance through rigorous virtual challenges",
  },
  {
    value: "15",
    label: "Top Teams",
    sub: "Qualify for the grand offline finale",
  },
  {
    value: "1",
    label: "Grand Finale",
    sub: "Build live at the Mumbai finale event",
  },
];

export function About() {
  const { ref, inView } = useInView<HTMLDivElement>();
  const { ref: highlightsRef, inView: highlightsInView } =
    useInView<HTMLDivElement>();

  return (
    <section id="about" className="relative scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
<SectionHeading
          eyebrow="About MUSA CodeX"
          title={
            <>
              A hackathon engineered for{" "}
              <span className="text-gradient">real impact</span>
            </>
          }
        />

        <div className="mt-8 flex justify-center">
          <img
            src="/musa-logo.png"
            alt="Organized by MUSA — Maharashtra University Students Association"
            className="h-24 w-24 rounded-full object-contain ring-1 ring-white/10 shadow-glow sm:h-28 sm:w-28"
          />
        </div>

        <div
          ref={ref}
          className={cn(
            "reveal mx-auto mt-8 max-w-4xl text-center",
            inView && "reveal-visible"
          )}
        >
          <p className="text-base leading-relaxed text-slate-300 sm:text-lg">
            MUSA CodeX is a <span className="font-semibold text-white">Mumbai college-level hackathon</span>{" "}
            designed to bring the region&apos;s brightest engineering students together.
            Participants tackle real-world challenges across focused domains, turning
            ideas into working prototypes in a high-energy, competitive environment.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-400 sm:text-lg">
            The journey spans <span className="font-semibold text-white">two online rounds</span>{" "}
            that test your thinking and execution, culminating in an{" "}
            <span className="font-semibold text-white">offline Grand Finale</span> where the{" "}
            <span className="font-semibold text-white">top 15 teams</span> compete live to
            build something extraordinary — and take home the crown.
          </p>
        </div>

<div
          ref={highlightsRef}
          className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3"
        >
          {highlights.map((item, i) => (
            <div
              key={item.label}
              className={cn(
                "reveal rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center backdrop-blur transition hover:border-purple-400/30 hover:bg-white/[0.06]",
                highlightsInView && "reveal-visible"
              )}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <p className="text-gradient text-4xl font-black sm:text-5xl">
                {item.value}
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {item.label}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                {item.sub}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
