import { Link } from "react-router-dom";

const WHATSAPP_JOIN_URL = "https://chat.whatsapp.com/I85ZR40got6K4XJYZs2eBv";

const infoBadges = [
  { label: "Entry Fee", value: "Free" },
  { label: "Team Size", value: "3-4 members" },
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
            href={WHATSAPP_JOIN_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-13 w-full items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-8 text-sm font-semibold text-emerald-50 shadow-[0_14px_40px_rgba(16,185,129,0.18)] transition hover:border-emerald-300/50 hover:bg-emerald-500/20 sm:w-auto"
          >
            Join WhatsApp Group
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="ml-2 h-4 w-4"
              aria-hidden="true"
            >
              <path d="M20.52 3.48A11.83 11.83 0 0 0 12.06 0C5.57 0 .27 5.29.27 11.78c0 2.08.54 4.11 1.57 5.89L0 24l6.51-1.72a11.73 11.73 0 0 0 5.53 1.41h.01c6.49 0 11.78-5.29 11.78-11.78 0-3.14-1.22-6.09-3.31-8.43ZM12.05 21.5h-.01a9.81 9.81 0 0 1-4.99-1.37l-.36-.21-3.87 1.02 1.03-3.77-.24-.39a9.83 9.83 0 0 1-1.5-5.21C2.11 6.65 6.06 2.7 12.05 2.7c2.63 0 5.11 1.03 6.98 2.89a9.79 9.79 0 0 1 2.9 6.98c0 6-4.96 9.93-9.88 9.93Zm5.73-7.58c-.31-.16-1.84-.9-2.12-1-.28-.1-.48-.16-.69.16-.2.31-.79 1-.97 1.2-.18.2-.36.23-.67.08-.31-.16-1.31-.48-2.49-1.53-.92-.82-1.54-1.84-1.72-2.15-.18-.31-.02-.47.14-.62.14-.14.31-.36.47-.54.16-.18.2-.31.31-.51.1-.2.05-.38-.03-.54-.08-.16-.69-1.68-.95-2.3-.25-.6-.5-.52-.69-.53l-.59-.01c-.2 0-.54.08-.82.38s-1.05 1.03-1.05 2.52 1.08 2.94 1.23 3.14c.16.2 2.1 3.2 5.08 4.49.71.31 1.27.5 1.7.64.71.23 1.36.2 1.87.12.57-.08 1.84-.75 2.1-1.47.26-.71.26-1.31.18-1.47-.08-.16-.28-.24-.59-.39Z" />
            </svg>
          </a>
          <a
            href="#about"
            className="inline-flex h-13 w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-8 text-sm font-semibold text-white backdrop-blur transition hover:border-white/30 hover:bg-white/10 sm:w-auto"
          >
            Explore Hackathon
          </a>
        </div>

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
