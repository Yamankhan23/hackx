import { useState } from "react";
import { SectionHeading } from "./SectionHeading";
import { useInView } from "./useInView";
import { cn } from "../../lib/utils";

const faqs = [
  {
    q: "What is MUSA CodeX 2026?",
    a: "MUSA CodeX is a Mumbai college-level hackathon where engineering students build solutions to real-world problems across ten domains. It features two online rounds followed by an offline Grand Finale in Mumbai.",
  },
  {
    q: "Who can participate?",
    a: "Engineering students from eligible colleges in the regions of Mumbai, Thane, Palghar, KDMC, and Navi Mumbai can participate. Cross-college teams are allowed.",
  },
  {
    q: "How many members can a team have?",
    a: "Each team must have 3–4 members. Individual registration is not allowed.",
  },
  {
    q: "What is the registration fee?",
    a: "There's no registration fee — Round 1 is completely free to enter. Make sure your team registers before Round 1 begins on 16 September 2026.",
  },
  {
    q: "How does the competition work?",
    a: "It's a five-stage journey: Registration → Round 1 → Round 2 → Top 15 → Grand Finale. Registration opens 24 August 2026, Round 1 is on 16 September 2026, Round 2 is on 22 September 2026, and the Grand Finale is on 27 September 2026.",
  },
  {
    q: "How many teams qualify for the Grand Finale?",
    a: "The top 15 teams from the online rounds qualify for the offline Grand Finale.",
  },
  {
    q: "What can I win?",
    a: "The prize pool totals ₹50,000: 1st place wins a trophy and ₹25,000 cash, 2nd place wins a trophy and ₹15,000, and 3rd place wins a trophy and ₹10,000. There's also a special Best Approach Award, and every participant receives a participation certificate.",
  },
  {
    q: "When will problem statements be released?",
    a: "Detailed problem statements across all domains will be released soon. Keep an eye on this page for updates.",
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <section id="faq" className="relative scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="FAQ"
          title={
            <>
              Questions? <span className="text-gradient">Answered.</span>
            </>
          }
          subtitle="Everything you need to know before you register."
        />

        <div
          ref={ref}
          className={cn(
            "reveal mt-10 space-y-3",
            inView && "reveal-visible"
          )}
        >
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={faq.q}
                className={cn(
                  "overflow-hidden rounded-2xl border backdrop-blur transition",
                  isOpen
                    ? "border-purple-400/40 bg-white/[0.06]"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20"
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-white sm:text-base">
                    {faq.q}
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={cn(
                      "h-4 w-4 shrink-0 text-purple-300 transition-transform duration-200",
                      isOpen ? "rotate-180" : ""
                    )}
                  >
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <div
                  className={cn(
                    "grid transition-all duration-300",
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-sm leading-relaxed text-slate-400">
                      {faq.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
