import { type ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";

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
  const adminName = localStorage.getItem("admin_name") ?? "Admin";
  const adminEmail = localStorage.getItem("admin_email") ?? "";

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col lg:flex-row">
        <aside className="border-b border-white/10 bg-[#081029]/80 px-4 py-4 backdrop-blur lg:sticky lg:top-0 lg:h-screen lg:w-[280px] lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between lg:block">
            <Link to="/admin/dashboard" className="block">
              <p className="text-xs uppercase tracking-[0.35em] text-purple-200/70">MUSA</p>
              <h1 className="mt-1 text-xl font-semibold">Admin Panel</h1>
            </Link>
            <button
              className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/70 lg:hidden"
              onClick={() => {
                localStorage.clear();
                navigate("/admin/login");
              }}
            >
              Logout
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-medium">{adminName}</p>
            <p className="mt-1 text-xs text-white/60">{adminEmail}</p>
          </div>

          <nav className="mt-5 grid grid-cols-4 gap-1.5 lg:grid-cols-1 lg:gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "rounded-xl px-1 py-2 text-center text-[11px] leading-tight transition lg:rounded-2xl lg:px-4 lg:py-3 lg:text-left lg:text-sm lg:leading-normal",
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
            className="mt-5 hidden w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:bg-white/10 lg:block"
            onClick={() => {
              localStorage.clear();
              navigate("/admin/login");
            }}
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
