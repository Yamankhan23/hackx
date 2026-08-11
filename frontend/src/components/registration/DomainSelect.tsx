import { useEffect, useRef, useState } from "react";
import type { Domain } from "../../types/registration";
import { cn } from "../../lib/utils";

type Props = {
  domains: Domain[];
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
  error?: string;
};

export function DomainSelect({ domains, value, onChange, loading, error }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedDomain = domains.find((domain) => String(domain.id) === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelect = (domain: Domain) => {
    onChange(String(domain.id));
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          "flex h-12 w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900/90 px-3 text-left text-sm text-white outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20",
          isOpen ? "border-purple-400 ring-2 ring-purple-500/20" : "",
          error ? "border-rose-500/50" : ""
        )}
      >
<span className={cn("truncate", value ? "text-white" : "text-slate-500")}>
          {loading ? (
            <span className="inline-flex items-center gap-2 text-slate-400">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-purple-300" />
              Loading domains...
            </span>
          ) : (
            (selectedDomain?.name ?? "Choose domain")
          )}
        </span>
        {loading ? null : (
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
            className={cn(
              "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200",
              isOpen ? "rotate-180 text-purple-300" : ""
            )}
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      {isOpen && !loading ? (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-1 shadow-lg"
        >
          {domains.map((domain) => {
            const isSelected = String(domain.id) === value;
            return (
              <li key={domain.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(domain)}
                  className={cn(
                    "w-full rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-purple-500/15",
                    isSelected
                      ? "bg-purple-500/20 font-medium text-purple-200"
                      : "text-slate-200"
                  )}
                >
                  {domain.name}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <p className="min-h-4 text-xs text-rose-300">{error}</p>
    </div>
  );
}

