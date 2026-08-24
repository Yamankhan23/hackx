import { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "../../lib/utils";

type NavItem = { label: string; to: string };

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Mobile nav for the admin dashboard: a floating "sheet" below the compact
 * top bar rather than a full-bleed panel, with a near-opaque blurred
 * background so it never merges with the scrolled content behind it.
 */
export function AdminMobileNav({
  open,
  onClose,
  navItems,
  adminName,
  adminEmail,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  navItems: NavItem[];
  adminName: string;
  adminEmail: string;
  onLogout: () => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    first?.focus();

    return () => {
      document.body.style.overflow = prevOverflow;
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const root = panelRef.current;
      if (!root) return;

      const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement as HTMLElement | null;

      if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <>
      <div
        onClick={onClose}
        role="presentation"
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-200 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Admin navigation"
        className={cn(
          // Fully solid, not translucent — no ambiguity about content
          // showing through behind it.
          "fixed inset-x-3 top-[3.25rem] z-50 max-h-[calc(100vh-4.5rem)] overflow-y-auto rounded-2xl border border-white/10 bg-[#0b1120] p-3 shadow-[0_24px_64px_rgba(0,0,0,0.45)] transition-all duration-200 lg:hidden",
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-3 scale-[0.98] opacity-0"
        )}
      >
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <p className="text-sm font-medium">{adminName}</p>
          <p className="text-xs text-white/60">{adminEmail}</p>
        </div>

        <nav className="mt-2 grid gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "rounded-xl border px-3 py-2 text-sm font-medium transition",
                  isActive
                    ? "border-purple-400/30 bg-gradient-to-r from-purple-600/25 to-blue-600/25 text-white ring-1 ring-purple-400/30"
                    : "border-white/10 bg-white/[0.03] text-white/75 hover:border-white/20 hover:bg-white/10 hover:text-white"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white/80 transition hover:bg-white/10"
          onClick={onLogout}
        >
          Logout
        </button>
      </div>
    </>
  );
}
