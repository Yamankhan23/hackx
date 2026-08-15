import { Link } from "react-router-dom";
import { useInView } from "./useInView";
import { cn } from "../../lib/utils";

export function FinalCta() {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <section id="cta" className="relative scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div
          ref={ref}
          className={cn(
            "reveal relative overflow-hidden rounded-[2rem] border border-purple-400/30 bg-gradient-to-br from-purple-600/20 via-[#0a0f24] to-blue-600/20 p-10 text-center sm:p-16",
            inView && "reveal-visible"
          )}
        >
          {/* background orbs */}
          <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-purple-600/25 blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-blue-600/25 blur-[100px]" />
          <div className="pointer-events-none absolute inset-0 bg-hack opacity-40" />

          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-purple-200/80">
              MUSA CodeX 2026
            </p>
            <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl">
              Your idea could win.{" "}
              <span className="text-gradient">Will you answer the call?</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Gather your team of 3–4, pick a domain, and build something
              extraordinary. The Grand Finale awaits in Mumbai.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/register"
                className="inline-flex h-13 w-full items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-9 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(91,33,182,0.45)] transition hover:brightness-110 sm:w-auto"
              >
                Register Now
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="ml-2 h-4 w-4"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <a
                href="#timeline"
                className="inline-flex h-13 w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-9 text-sm font-semibold text-white backdrop-blur transition hover:border-white/30 hover:bg-white/10 sm:w-auto"
              >
                See the Timeline
              </a>
            </div>

            <p className="mt-6 text-xs text-slate-500">
              ₹400 / team · 3–4 members · 6 September 2026 · Mumbai
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
