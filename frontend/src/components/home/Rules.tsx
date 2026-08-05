import { SectionHeading } from "./SectionHeading";
import { useInView } from "./useInView";
import { cn } from "../../lib/utils";

const eligibility = [
  {
    title: "Who can participate",
    desc: "Engineering students from eligible colleges.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M7 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Team size",
    desc: "Teams must have 3–4 members.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M7 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 21v-2a4 4 0 0 0-3-3.87M15 3.13A4 4 0 0 1 15 11" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Individual registration",
    desc: "Individual registration is not allowed.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
        <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Cross-college teams",
    desc: "Cross-college teams are allowed.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
        <path d="M3 12h4l2-5 4 10 2-5h4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const regions = ["Mumbai", "Thane", "Palghar", "KDMC", "Navi Mumbai"];

export function Rules() {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <section id="rules" className="relative scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Rules & Eligibility"
          title={
            <>
              Ready to <span className="text-gradient">take part?</span>
            </>
          }
          subtitle="Make sure you and your team meet the requirements before registering."
        />

        <div
          ref={ref}
          className={cn(
            "reveal mt-12 grid grid-cols-1 gap-5 lg:grid-cols-5",
            inView && "reveal-visible"
          )}
        >
          {/* Eligibility cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-3">
            {eligibility.map((item) => (
              <div
                key={item.title}
                className="group flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur transition duration-300 hover:border-purple-400/30 hover:bg-white/[0.06]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600/25 to-blue-600/25 text-purple-100 ring-1 ring-purple-400/25">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Eligible regions */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-purple-500/10 to-transparent p-6 backdrop-blur lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-purple-200/80">
              Eligible Regions
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Teams from these Maharashtra regions can participate:
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {regions.map((region) => (
                <span
                  key={region}
                  className="rounded-full border border-purple-400/30 bg-purple-500/10 px-3.5 py-1.5 text-sm font-medium text-purple-100"
                >
                  {region}
                </span>
              ))}
            </div>
            <p className="mt-5 rounded-xl border border-white/10 bg-white/[0.05] p-3 text-xs leading-relaxed text-slate-400">
              Cross-college teams are permitted as long as all members are from
              eligible colleges and regions.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
