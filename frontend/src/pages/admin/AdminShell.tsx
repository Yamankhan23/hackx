import { type ReactNode, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { AdminMobileNav } from "./AdminMobileNav";

const navItems = [
  { label: "Dashboard", to: "/admin/dashboard" },
  { label: "Teams", to: "/admin/teams" },
  { label: "Participants", to: "/admin/participants" },
  { label: "Domains", to: "/admin/domains" },
  { label: "Colleges", to: "/admin/colleges" },
  { label: "Rounds", to: "/admin/rounds" },
  { label: "Problem Statements", to: "/admin/problem-statements" },
  { label: "Payments", to: "/admin/payments" },
];

export default function AdminShell({
  title,
  subtitle,
  primaryAction,
  children,
}: {
  title: string;
  subtitle?: string;
  primaryAction?: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const adminName = localStorage.getItem("admin_name") ?? "Admin";
  const adminEmail = localStorage.getItem("admin_email") ?? "";

  const handleLogout = () => {
    localStorage.clear();
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col lg:flex-row">
        {/* Mobile top bar — sticky so the toggle stays reachable while
            scrolling a long list, fully opaque (not translucent) so it
            never blends with content scrolling underneath it. */}
        <div className="sticky top-0 z-30 flex h-[3.25rem] items-center justify-between border-b border-white/10 bg-[#050816] px-4 lg:hidden">
          <Link to="/admin/dashboard" className="flex items-baseline gap-1.5">
            <span className="text-[9px] uppercase tracking-[0.3em] text-purple-200/70">MUSA</span>
            <span className="text-sm font-semibold">Admin Panel</span>
          </Link>
          <button
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              className="h-4 w-4"
            >
              {mobileNavOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>

        <AdminMobileNav
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          navItems={navItems}
          adminName={adminName}
          adminEmail={adminEmail}
          onLogout={handleLogout}
        />

        {/* Desktop sidebar — unchanged layout, just no longer sharing
            breakpoint-toggled classes with the mobile bar above. */}
        <aside className="hidden border-r border-white/10 bg-[#081029]/80 px-4 py-4 backdrop-blur lg:sticky lg:top-0 lg:block lg:h-screen lg:w-[280px]">
          <Link to="/admin/dashboard" className="block">
            <p className="text-xs uppercase tracking-[0.35em] text-purple-200/70">MUSA</p>
            <h1 className="mt-1 text-xl font-semibold">Admin Panel</h1>
          </Link>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-medium">{adminName}</p>
            <p className="mt-1 text-xs text-white/60">{adminEmail}</p>
          </div>

          <nav className="mt-5 grid gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "rounded-2xl px-4 py-3 text-sm transition",
                    isActive
                      ? "bg-gradient-to-r from-purple-600/25 to-blue-600/25 text-white ring-1 ring-purple-400/30"
                      : "border border-white/10 bg-white/5 text-white/75 hover:border-white/20 hover:bg-white/10 hover:text-white",
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <button
            className="mt-5 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:bg-white/10"
            onClick={handleLogout}
          >
            Logout
          </button>
        </aside>

        <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
              {subtitle ? <p className="mt-1 max-w-2xl text-sm leading-6 text-white/60">{subtitle}</p> : null}
            </div>
            {primaryAction ? <div className="shrink-0">{primaryAction}</div> : null}
          </header>

          <div className="mt-5">{children}</div>
        </main>
      </div>
    </div>
  );
}
