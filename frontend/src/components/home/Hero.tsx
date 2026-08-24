import { Link } from "react-router-dom";

const infoBadges = [
  { label: "Entry Fee", value: "Free" },
  { label: "Team Size", value: "3–4 members" },
  { label: "Grand Finale", value: "27 September 2026" },
  { label: "Location", value: "Mumbai" },
];

export function Hero() {
  return (
    <section
      id="home"
      className="bg-hack relative flex min-h-screen items-center justify-center overflow-hidden pt-24 pb-16"
    >
      {/* floating glow orbs */}
      <div className="pointer-events-none absolute -top-20 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-purple-600/20 blur-[120px]" />
      <div className="animate-float-slow pointer-events-none absolute right-[8%] top-1/4 h-40 w-40 rounded-full bg-blue-500/20 blur-[90px]" />
      <div className="animate-pulse-glow pointer-events-none absolute bottom-1/4 left-[6%] h-32 w-32 rounded-full bg-purple-500/15 blur-[80px]" />

      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 text-center sm:px-6">

        <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-1.5 text-xs font-medium text-purple-100">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
          Mumbai College-Level Hackathon · 2026
        </div>

        <p className="animate-fade-up mt-6 text-xs font-semibold uppercase tracking-[0.4em] text-purple-200/80">
          MUSA CodeX 2026
        </p>

        <h1 className="animate-fade-up mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
          <span className="block text-white">Build the future.</span>
          <span className="text-gradient block">Innovate. Impact.</span>
        </h1>

        <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
          A futuristic hackathon where brilliant minds from Mumbai&apos;s
          engineering colleges come together to solve real-world problems
          through two rigorous online rounds and a grand offline finale.
        </p>

        <div
          className="animate-fade-up mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          style={{ animationDelay: "0.15s" }}
        >
          <Link
            to="/register"
            className="inline-flex h-13 w-full items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-8 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(91,33,182,0.4)] transition hover:brightness-110 sm:w-auto sm:h-13"
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
            href="#about"
            className="inline-flex h-13 w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-8 text-sm font-semibold text-white backdrop-blur transition hover:border-white/30 hover:bg-white/10 sm:w-auto"
          >
            Explore Hackathon
          </a>
        </div>

        {/* Key info */}
        <div
          className="animate-fade-up mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4"
          style={{ animationDelay: "0.25s" }}
        >
          {infoBadges.map((badge) => (
            <div
              key={badge.label}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-4 backdrop-blur transition hover:border-purple-400/30 hover:bg-white/[0.07]"
            >
              <p className="text-[11px] font-medium uppercase tracking-widest text-slate-500">
                {badge.label}
              </p>
              <p className="mt-1.5 text-sm font-semibold text-white sm:text-base">
                {badge.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
