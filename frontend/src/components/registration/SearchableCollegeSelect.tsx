import { useEffect, useRef, useState } from "react";
import type { College } from "../../types/registration";
import { cn } from "../../lib/utils";

type Props = {
  colleges: College[];
  value: string;
  onSelect: (college: College | null) => void;
  onManualNameChange: (name: string) => void;
  manualName: string;
  error?: string;
};

export function SearchableCollegeSelect({
  colleges,
  value,
  onSelect,
  onManualNameChange,
  manualName,
  error,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showManual, setShowManual] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filteredColleges = colleges.filter((college) => {
    const q = search.toLowerCase();
    return (
      college.name.toLowerCase().includes(q) ||
      (college.university && college.university.toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (college: College) => {
    onSelect(college);
    setSearch(college.name);
    setShowManual(false);
    setIsOpen(false);
  };

  const handleToggleManual = () => {
    const next = !showManual;
    setShowManual(next);
    if (next) {
      onSelect(null);
      setSearch("");
      setIsOpen(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    setIsOpen(true);
    if (!val) {
      onSelect(null);
    }
  };

  const selectedCollegeName = value || "";

  return (
    <div ref={wrapperRef} className="relative">
      {!showManual ? (
        <>
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            onFocus={() => setIsOpen(true)}
            placeholder="Search for your college..."
            className={cn(
              "h-11 w-full rounded-xl border border-slate-800 bg-slate-900/90 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20",
              error ? "border-rose-500/50" : ""
            )}
          />

          {isOpen && (
            <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 shadow-lg">
              {filteredColleges.length > 0 ? (
                filteredColleges.map((college) => (
                  <button
                    key={college.id}
                    type="button"
                    onClick={() => handleSelect(college)}
                    className={cn(
                      "flex w-full flex-col px-3 py-2.5 text-left text-sm transition hover:bg-purple-500/15",
                      selectedCollegeName === college.name
                        ? "bg-purple-500/20 text-purple-200"
                        : "text-slate-200"
                    )}
                  >
                    <span className="font-medium">{college.name}</span>
                    {college.university ? (
                      <span className="text-xs text-slate-400">{college.university}</span>
                    ) : null}
                  </button>
                ))
              ) : (
                <div className="px-3 py-3 text-sm text-slate-400">
                  No colleges found.{" "}
                  <button
                    type="button"
                    onClick={handleToggleManual}
                    className="text-purple-300 underline underline-offset-2 hover:text-purple-200"
                  >
                    Enter manually
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleToggleManual}
            className="mt-1.5 text-xs text-slate-400 underline underline-offset-2 hover:text-purple-300 transition"
          >
            Can't find your college? Enter manually
          </button>
        </>
      ) : (
        <div className="grid gap-2">
          <input
            type="text"
            value={manualName}
            onChange={(e) => onManualNameChange(e.target.value)}
            placeholder="Enter your college name"
            className={cn(
              "h-11 w-full rounded-xl border border-slate-800 bg-slate-900/90 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20",
              error ? "border-rose-500/50" : ""
            )}
          />
          <button
            type="button"
            onClick={handleToggleManual}
            className="text-xs text-slate-400 underline underline-offset-2 hover:text-purple-300 transition"
          >
            ← Back to college search
          </button>
        </div>
      )}

      <p className="min-h-4 text-xs text-rose-300">{error}</p>
    </div>
  );
}
