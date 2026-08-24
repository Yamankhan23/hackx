import { Link } from "react-router-dom";

const quickLinks = [
  { label: "About", href: "#about" },
  { label: "Domains", href: "#domains" },
  { label: "Timeline", href: "#timeline" },
  { label: "Prizes", href: "#prizes" },
  { label: "FAQ", href: "#faq" },
];

const socials = [
  {
    label: "Instagram",
    href: "https://instagram.com/musaforstudents",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <path d="M17.5 6.5h.01" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "WhatsApp",
    href: "https://wa.me/918657224803",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
        <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.1-5.4A8.5 8.5 0 1 1 21 11.5z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 10.5c1.5 2.5 3 4 5.5 5.5M9 10.5 10.5 9M15.5 16 17 15l-1.5-2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
        <path d="M22 12s0-3.3-.4-4.9c-.2-.9-.9-1.6-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.3c-.9.2-1.6.9-1.8 1.8C2 8.7 2 12 2 12s0 3.3.4 4.9c.2.9.9 1.6 1.8 1.8 1.6.3 7.8.3 7.8.3s6.2 0 7.8-.3c-.9-.2 1.6-.9 1.8-1.8.4-1.6.4-4.9.4-4.9z" strokeLinejoin="round" />
        <path d="M10 9.5v5l4.5-2.5L10 9.5z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function Footer() {
  return (
    <footer className="relative border-t border-white/10 bg-[#050816]">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <a href="#home" className="flex items-center gap-2.5">
              <img
                src="/musa-logo.png"
                alt="MUSA — Maharashtra University Students Association"
                className="h-10 w-10 rounded-full object-contain ring-1 ring-white/10"
              />
              <span className="flex flex-col leading-none">
                <span className="text-sm font-bold tracking-tight text-white">
                  MUSA CodeX
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-purple-200/70">
                  2026
                </span>
              </span>
            </a>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
              Mumbai&apos;s futuristic college-level hackathon. Two online rounds,
              top 15 teams, and a grand offline finale. Build. Innovate. Impact.
            </p>
            <div className="mt-5 flex gap-2.5">
              {socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target={social.href === "#" ? undefined : "_blank"}
                  rel={social.href === "#" ? undefined : "noopener noreferrer"}
                  aria-label={social.label}
                  title={social.href === "#" ? `${social.label} (Coming Soon)` : social.label}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:border-purple-400/40 hover:bg-purple-500/10 hover:text-white"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              Explore
            </p>
            <ul className="mt-4 space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-slate-400 transition hover:text-white"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <Link
                  to="/register"
                  className="text-sm font-medium text-white transition hover:text-purple-300"
                >
                  Register Now
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              Contact
            </p>
            <ul className="mt-4 space-y-3 text-sm text-slate-400">
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 text-purple-300">📍</span>
                <span>
                  Global Mill Passage, Municipal School, Near Deepak Talkies,
                  Lower Parel, Mumbai 400013
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 text-purple-300">✉️</span>
                <a href="mailto:musaforstudents@gmail.com" className="hover:text-white">
                  musaforstudents@gmail.com
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 text-purple-300">📞</span>
                <span>
                  General:{" "}
                  <a href="tel:+918657224803" className="hover:text-white">
                    +91 86572 24803
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 text-purple-300">🤝</span>
                <span>
                  Partnership:{" "}
                  <a href="tel:+919284363442" className="hover:text-white">
                    +91 92843 63442
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 text-purple-300">📅</span>
                <span>Grand Finale · 27 September 2026</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} MUSA CodeX. All rights reserved.
          </p>
          <p className="text-xs text-slate-600">
            Build. Innovate. Impact.
          </p>
        </div>
      </div>
    </footer>
  );
}
