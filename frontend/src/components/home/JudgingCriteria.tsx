import { SectionHeading } from "./SectionHeading";
import { useInView } from "./useInView";
import { cn } from "../../lib/utils";

const criteria = [
  {
    title: "Innovation",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
        <path d="M13 2 3 14h7l-1 8 11-13h-7l1-7z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Problem Understanding",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Technical Implementation",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
        <path d="M8 9l-3 3 3 3m8-6 3 3-3 3M13 5l-2 14" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Scalability",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
        <path d="M3 17l6-6 4 4 8-8M15 7h6v6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Practical Impact",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
        <path d="M12 3v3m0 12v3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M3 12h3m12 0h3M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Presentation",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
        <path d="M4 4h16v12H4zM8 20h8m-4-4v4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "User Experience",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
        <rect x="2" y="4" width="20" height="14" rx="2" />
        <path d="M2 9h20M6 14h5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Teamwork",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M7 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 21v-2a4 4 0 0 0-3-3.87M15 3.13A4 4 0 0 1 15 11" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function JudgingCriteria() {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <section id="judging" className="relative scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Judging Criteria"
          title={
            <>
              How the <span className="text-gradient">best</span> is decided
            </>
          }
          subtitle="Mentors and judges evaluate every submission across eight dimensions."
        />

        <div
          ref={ref}
          className={cn(
            "reveal mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4",
            inView && "reveal-visible"
          )}
        >
          {criteria.map((criterion) => (
            <div
              key={criterion.title}
              className="group flex items-center gap-3.5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-4 backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-blue-400/30 hover:bg-white/[0.07]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600/25 to-blue-600/25 text-purple-100 ring-1 ring-purple-400/25 transition group-hover:from-purple-600/50 group-hover:to-blue-600/50">
                {criterion.icon}
              </div>
              <span className="text-sm font-medium leading-snug text-slate-100">
                {criterion.title}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
