import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import api from "../../services/api";
import AdminShell from "./AdminShell";

type SectionKey =
  | "teams"
  | "participants"
  | "payments"
  | "domains"
  | "colleges"
  | "rounds"
  | "problem-statements";

type Row = Record<string, unknown>;

const labels: Record<SectionKey, string> = {
  teams: "Teams",
  participants: "Participants",
  payments: "Payments",
  domains: "Domains",
  colleges: "Colleges",
  rounds: "Rounds",
  "problem-statements": "Problem Statements",
};

const endpoints: Partial<Record<Exclude<SectionKey, "payments">, string>> = {
  teams: "/api/admin/teams",
  participants: "/api/admin/participants",
  domains: "/api/admin/domains",
  colleges: "/api/admin/colleges",
  rounds: "/api/admin/rounds",
  "problem-statements": "/api/admin/problem-statements",
};

export default function AdminSectionPage() {
  const { section } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const key = section as SectionKey | undefined;
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | number | null>(null);
  const teamIdFilter = searchParams.get("teamId") ?? "";

  const title = useMemo(() => {
    if (!key || !(key in labels)) return "Admin";
    return labels[key];
  }, [key]);

  useEffect(() => {
    if (!localStorage.getItem("admin_token")) {
      navigate("/admin/login");
      return;
    }

    if (!key || key === "payments") {
      setRows([]);
      return;
    }

    const endpoint = endpoints[key];
    if (!endpoint) return;

    let active = true;
    setLoading(true);
    setError("");

    const params: Record<string, string> = {};
    if (key === "participants" && teamIdFilter) {
      params.teamId = teamIdFilter;
    }

    api
      .get(endpoint, { params })
      .then((res) => {
        if (!active) return;
        setRows(Array.isArray(res.data.data) ? res.data.data : []);
      })
      .catch(() => {
        if (!active) return;
        setError("Failed to load data");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [key, navigate, teamIdFilter]);

  const filteredRows = useMemo(() => {
    if (!query.trim()) return rows;
    const needle = query.toLowerCase();
    return rows.filter((row) =>
      Object.entries(row).some(([, value]) =>
        stringify(value).toLowerCase().includes(needle)
      )
    );
  }, [query, rows]);

  return (
    <AdminShell
      title={title}
      subtitle={
        key === "teams"
          ? "Scan team status, review members, and jump into details without wading through a dense table."
          : key === "participants"
            ? "Search participants quickly and inspect verification and college context."
            : key === "payments"
              ? "Payments will be wired once that workflow starts."
              : "Manage records in a clean, mobile-friendly card layout."
      }
      primaryAction={
        key === "payments" ? null : (
          <div className="rounded-2xl border border-purple-400/25 bg-purple-500/10 px-3 py-2 text-sm text-purple-100">
            {rows.length} records
          </div>
        )
      }
    >
      {key === "payments" ? (
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-6 text-white/70">
          Payments are not wired in the frontend yet.
        </div>
      ) : (
        <div className="grid gap-5">
          {key === "participants" && teamIdFilter ? (
            <section className="rounded-[24px] border border-purple-400/20 bg-purple-500/10 px-4 py-3 text-sm text-purple-100">
              Showing participants for team <span className="font-semibold">{teamIdFilter}</span>
              <button
                className="ml-3 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80"
                onClick={() => setSearchParams({})}
              >
                Clear filter
              </button>
            </section>
          ) : null}

          <section className="rounded-[24px] border border-white/10 bg-white/5 p-4 shadow-[0_20px_60px_rgba(8,15,35,0.25)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-white/60">Search</p>
                <h3 className="mt-1 text-lg font-semibold">Find records fast</h3>
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${title.toLowerCase()}`}
                className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm outline-none transition placeholder:text-white/35 focus:border-purple-400/40 sm:max-w-sm"
              />
            </div>
          </section>

          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="rounded-[24px] border border-white/10 bg-white/5 p-4 animate-pulse sm:p-5">
                  <div className="h-3 w-28 rounded-full bg-white/10" />
                  <div className="mt-4 h-5 w-3/4 rounded-full bg-white/10" />
                  <div className="mt-3 h-3 w-1/2 rounded-full bg-white/10" />
                  <div className="mt-6 h-10 rounded-2xl bg-white/10" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-[24px] border border-red-400/20 bg-red-500/10 p-6 text-sm text-red-100">{error}</div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-8 text-center">
              <p className="text-lg font-semibold">No records found</p>
              <p className="mt-2 text-sm text-white/60">
                {query ? "Try a different search term." : "Nothing has been added yet."}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredRows.map((row, index) => {
                const id = String(row.id ?? row.teamId ?? row.paymentId ?? index);
                const isOpen = expanded === id;
                return (
                  <article
                    key={id}
                    className="rounded-[24px] border border-white/10 bg-white/5 p-4 shadow-[0_20px_60px_rgba(8,15,35,0.25)] sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.25em] text-white/45">Record</p>
                        <h3 className="mt-2 text-lg font-semibold">{primaryLabel(key, row)}</h3>
                      </div>
                      <StatusPill value={row.status ?? row.isPublished ?? row.emailVerified} />
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-white/65">
                      {summaryLines(key, row).slice(0, 3).map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <button
                        className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-sm font-medium text-white/85 transition hover:border-white/20 hover:bg-white/10"
                        onClick={() => setExpanded(isOpen ? null : id)}
                      >
                        {isOpen ? "Hide details" : "View details"}
                      </button>
                      {key === "teams" ? (
                        <button
                          className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 text-sm font-semibold text-white transition hover:brightness-110"
                          onClick={() => navigate(`/admin/participants?teamId=${encodeURIComponent(String(row.teamId ?? ""))}`)}
                        >
                          Participants
                        </button>
                      ) : null}
                    </div>

                    {isOpen ? (
                      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
                        {Object.entries(row)
                          .filter(([key]) => key !== "passwordHash" && key !== "razorpaySignature")
                          .map(([key, value]) => (
                            <div key={key} className="flex items-start justify-between gap-3 border-b border-white/5 py-2 last:border-b-0">
                              <span className="text-white/45">{formatKey(key)}</span>
                              <span className="text-right">{stringify(value)}</span>
                            </div>
                          ))}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </AdminShell>
  );
}

function stringify(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Verified" : "Pending";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return `${value.length} items`;
  return JSON.stringify(value);
}

function formatKey(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function primaryLabel(section: SectionKey | undefined, row: Row) {
  if (section === "teams") return String(row.teamName ?? row.teamId ?? "Team");
  if (section === "participants") return String(row.name ?? row.fullName ?? row.email ?? "Participant");
  if (section === "domains") return String(row.name ?? "Domain");
  if (section === "colleges") return String(row.name ?? "College");
  if (section === "rounds") return String(row.name ?? row.roundId ?? "Round");
  if (section === "problem-statements") return String(row.title ?? row.problemStatementId ?? "Problem Statement");
  return String(row.id ?? "Record");
}

function summaryLines(section: SectionKey | undefined, row: Row) {
  if (section === "teams") {
    return [
      `Team ID: ${stringify(row.teamId)}`,
      `Registration ID: ${stringify(row.registrationId)}`,
      `Domain: ${stringify(row.domainName)}`,
      `Status: ${stringify(row.status)}`,
    ];
  }

  if (section === "participants") {
    return [
      `Email: ${stringify(row.email)}`,
      `Team: ${stringify(row.teamName)}`,
      `College: ${stringify(row.college)}`,
      `Year: ${stringify(row.yearOfStudy)}`,
    ];
  }

  if (section === "domains") {
    return [
      `Description: ${stringify(row.description)}`,
      `Status: ${row.isActive === false ? "Inactive" : "Active"}`,
    ];
  }

  if (section === "colleges") {
    return [
      `College ID: ${stringify(row.collegeId)}`,
      `Region: ${stringify(row.region)}`,
      `University: ${stringify(row.university)}`,
      `Status: ${row.isActive === false ? "Inactive" : "Active"}`,
    ];
  }

  if (section === "rounds") {
    return [
      `Round ID: ${stringify(row.roundId)}`,
      `Type: ${stringify(row.type)}`,
      `Round number: ${stringify(row.roundNumber)}`,
      `Status: ${stringify(row.status)}`,
    ];
  }

  if (section === "problem-statements") {
    return [
      `Problem ID: ${stringify(row.problemStatementId)}`,
      `Domain: ${stringify(row.domainName)}`,
      `Published: ${row.isPublished ? "Yes" : "No"}`,
    ];
  }

  return Object.entries(row)
    .filter(([key]) => key !== "id")
    .slice(0, 3)
    .map(([key, value]) => `${formatKey(key)}: ${stringify(value)}`);
}

function StatusPill({ value }: { value: unknown }) {
  const status = typeof value === "boolean" ? (value ? "Verified" : "Pending") : stringify(value);
  const normalized = status.toLowerCase();
  const tone =
    normalized.includes("confirmed") || normalized.includes("verified") || normalized === "true"
      ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
      : normalized.includes("pending")
        ? "border-amber-400/25 bg-amber-500/10 text-amber-100"
        : normalized.includes("cancelled") || normalized.includes("failed") || normalized === "false"
          ? "border-red-400/25 bg-red-500/10 text-red-100"
          : "border-white/10 bg-white/5 text-white/70";

  return (
    <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.2em] ${tone}`}>
      {status}
    </span>
  );
}
