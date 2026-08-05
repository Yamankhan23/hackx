import { SectionHeading } from "./SectionHeading";
import { useInView } from "./useInView";
import { cn } from "../../lib/utils";

const items = [
  {
    title: "Innovate Fearlessly",
    desc: "Build something original and push the boundaries of what's possible with cutting-edge technology.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path d="M13 2 3 14h7l-1 8 11-13h-7l1-7z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    accent: "from-purple-500/20 to-purple-500/0",
    number: "01",
  },
  {
    title: "Solve Real Problems",
    desc: "Apply your skills to practical, real-world challenges and build solutions that matter.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path d="M9 12h6m-6 4h6m-3-16 3 4H9l3-4z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 6h16v14H4z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    accent: "from-blue-500/20 to-blue-500/0",
    number: "02",
  },
  {
    title: "Teamwork & Collaboration",
    desc: "Partner with up to four sharp minds, combine strengths and ship together under pressure.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M7 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 21v-2a4 4 0 0 0-3-3.87M15 3.13A4 4 0 0 1 15 11" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    accent: "from-cyan-500/20 to-cyan-500/0",
    number: "03",
  },
  {
    title: "Exposure & Recognition",
    desc: "Showcase your talent to the community and stand out in front of judges and mentors.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    accent: "from-fuchsia-500/20 to-fuchsia-500/0",
    number: "04",
  },
  {
    title: "Present & Win Certificates",
    desc: "Hone your presentation skills and earn official participation certificates for your effort.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <circle cx="12" cy="9" r="6" />
        <path d="M9 14.5 7.5 21l4.5-2.5L16.5 21 15 14.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    accent: "from-indigo-500/20 to-indigo-500/0",
    number: "05",
  },
];

export function WhyParticipate() {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <section id="why" className="relative scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Why Participate"
          title={
            <>
              More than a contest — a{" "}
              <span className="text-gradient">launchpad</span>
            </>
          }
          subtitle="Every challenge is a chance to grow, build, and be seen."
        />

        <div
          ref={ref}
          className={cn(
            "reveal mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3",
            inView && "reveal-visible"
          )}
        >
          {items.map((item, i) => (
            <div
              key={item.title}
              className={cn(
                "group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-purple-400/30 hover:shadow-[0_20px_60px_rgba(91,33,182,0.15)]",
                i === 4 ? "sm:col-span-2 lg:col-span-1" : ""
              )}
            >
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-b",
                  item.accent
                )}
              />
              <div className="relative flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600/30 to-blue-600/30 text-purple-100 ring-1 ring-purple-400/30">
                  {item.icon}
                </div>
                <span className="text-4xl font-black text-white/5 transition group-hover:text-white/10">
                  {item.number}
                </span>
              </div>
              <h3 className="relative mt-5 text-lg font-semibold text-white">
                {item.title}
              </h3>
              <p className="relative mt-2 text-sm leading-relaxed text-slate-400">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
