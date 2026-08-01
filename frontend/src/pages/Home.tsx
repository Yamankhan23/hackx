import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050816] px-4 py-6 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl flex-col items-center justify-center text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-purple-200/80">
          MUSA HackX 2026
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Build. Innovate. Impact.
        </h1>
        <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-400">
          Register your team for MUSA HackX 2026 and compete to build something amazing.
        </p>
        <Link
          to="/register"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-8 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(91,33,182,0.3)] transition hover:brightness-110"
        >
          Register Now {"->"}
        </Link>
      </div>
    </div>
  );
}
