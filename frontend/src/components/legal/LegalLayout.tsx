import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Footer } from "../home/Footer";

export function LegalLayout({
  title,
  updatedOn,
  children,
}: {
  title: string;
  updatedOn: string;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050816] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src="/musa-logo.png"
              alt="MUSA, the Maharashtra University Students Association"
              className="h-7 w-7 rounded-full object-contain ring-1 ring-white/10"
            />
            <span className="flex flex-col leading-none">
              <span className="text-xs font-bold tracking-tight text-white">
                MUSA CodeX
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-[0.3em] text-purple-200/70">
                2026
              </span>
            </span>
          </Link>
          <Link
            to="/"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            ← Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-purple-200/80">
          MUSA CodeX 2026
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: {updatedOn}</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-slate-300">
          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-base font-semibold text-white">{heading}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}
