import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";

const links = [
  { label: "About", href: "#about" },
  { label: "Domains", href: "#domains" },
  { label: "Timeline", href: "#timeline" },
  { label: "Prizes", href: "#prizes" },
  { label: "Sponsors", href: "#sponsors" },
  { label: "FAQ", href: "#faq" },
  { label: "Continue Application", href: "#continue" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        // Solid dark background at all times, not translucent — a
        // translucent/blurred backdrop still let hero content show through
        // as visual noise behind the nav text. `scrolled` now only adds a
        // border/shadow for definition once you've moved off the top.
        "fixed inset-x-0 top-0 z-50 bg-[#050816] transition-shadow duration-300",
        scrolled ? "border-b border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.35)]" : "border-b border-transparent"
      )}
    >
      <nav className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
{/* Branding */}
        <a href="#home" className="group flex items-center gap-2">
          <img
            src="/musa-logo.png"
            alt="MUSA — Maharashtra University Students Association"
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
        </a>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            to="/register"
            className="inline-flex h-8 items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-4 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(91,33,182,0.35)] transition hover:brightness-110"
          >
            Register Now
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white lg:hidden"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            className="h-4 w-4"
          >
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile menu — solid, not translucent, so it never blends with
          whatever's scrolled underneath. */}
      <div
        className={cn(
          "fixed inset-x-0 top-12 bottom-0 z-40 flex flex-col gap-1.5 bg-[#050816] px-4 pt-3 transition-opacity duration-200 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            onClick={() => setOpen(false)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
          >
            {link.label}
          </a>
        ))}
        <Link
          to="/register"
          onClick={() => setOpen(false)}
          className="mt-2 inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(91,33,182,0.35)]"
        >
          Register Now
        </Link>
      </div>
    </header>
  );
}
