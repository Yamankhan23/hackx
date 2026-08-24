import { SectionHeading } from "./SectionHeading";
import { useInView } from "./useInView";
import { cn } from "../../lib/utils";

const domains = [
  {
    name: "Artificial Intelligence & Machine Learning",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9l2.1 2.1m10 10 2.1 2.1M19.1 4.9 17 7m-10 10-2.1 2.1" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: "Cybersecurity & Digital Safety",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    name: "Healthcare & MedTech",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    name: "Education & Skill Development",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6">
        <path d="M22 10 12 5 2 10l10 5 10-5zM6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    name: "Smart Cities & Urban Technology",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6">
        <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1m4 0h1M9 13h1m4 0h1M9 17h1m4 0h1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    name: "Sustainability & Climate Technology",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6">
        <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-2.5-5.5C14.5 7.5 12 5 12 2c-5 4-8 8.5-8 13a7 7 0 0 0 8 7z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    name: "AgriTech & Food Technology",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6">
        <path d="M7 20h10M10 20c0-4 1-7 5-9M12 20c0-5 2-8 6-10M7 20c0-3 1-5 3-7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    name: "FinTech & Digital Economy",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20M6 15h4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: "IoT, Automation & Smart Systems",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2.5v3m0 13v3M2.5 12h3m13 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: "Women Safety & Social Impact",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6">
        <path d="M12 21s7-4.5 7-10V5l-7-3-7 3v6c0 5.5 7 10 7 10z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 8.5v4m0 0h.01" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function Domains() {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <section id="domains" className="relative scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Domains"
          title={
            <>
              Choose your <span className="text-gradient">battlefield</span>
            </>
          }
          subtitle="Ten focused domains where your ideas can make a real difference."
        />

        <div
          ref={ref}
          className={cn(
            "reveal mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
            inView && "reveal-visible"
          )}
        >
          {domains.map((domain, i) => (
            <div
              key={domain.name}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-purple-400/40 hover:bg-white/[0.07] hover:shadow-[0_20px_60px_rgba(91,33,182,0.18)]"
            >
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-purple-600/10 blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600/30 to-blue-600/30 text-purple-100 ring-1 ring-purple-400/30 transition group-hover:from-purple-600 group-hover:to-blue-600 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                  {domain.icon}
                </div>
                <h3 className="text-sm font-semibold leading-snug text-white sm:text-base">
                  {domain.name}
                </h3>
              </div>
              <span className="pointer-events-none absolute bottom-3 right-4 text-3xl font-black text-white/5 transition group-hover:text-white/10">
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
