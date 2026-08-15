import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  adminService,
  getApiErrorMessage,
  type College,
  type Domain,
  type ProblemStatement,
  type Round,
  type TeamStatus,
} from "../../services/admin.service";
import { useAdminGuard } from "../../hooks/useAdminGuard";
import { useToast } from "../../hooks/useToast";
import { Modal } from "../../components/admin/Modal";
import { DomainForm } from "../../components/admin/DomainForm";
import { CollegeForm } from "../../components/admin/CollegeForm";
import { RoundForm } from "../../components/admin/RoundForm";
import { ProblemStatementForm } from "../../components/admin/ProblemStatementForm";
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

const CRUD_SECTIONS: SectionKey[] = ["domains", "colleges", "rounds", "problem-statements"];
const TEAM_STATUSES: TeamStatus[] = ["DRAFT", "PENDING_PAYMENT", "CONFIRMED", "CANCELLED"];

const labels: Record<SectionKey, string> = {
  teams: "Teams",
  participants: "Participants",
  payments: "Payments",
  domains: "Domains",
  colleges: "Colleges",
  rounds: "Rounds",
  "problem-statements": "Problem Statements",
};

const listLoaders: Partial<Record<SectionKey, () => Promise<Row[]>>> = {
  teams: () => adminService.getTeams() as Promise<Row[]>,
  participants: () => adminService.getParticipants() as Promise<Row[]>,
  domains: () => adminService.getDomains() as Promise<Row[]>,
  colleges: () => adminService.getColleges() as Promise<Row[]>,
  rounds: () => adminService.getRounds() as Promise<Row[]>,
  "problem-statements": () => adminService.getProblemStatements() as Promise<Row[]>,
};

const createLabels: Record<string, string> = {
  domains: "New Domain",
  colleges: "New College",
  rounds: "New Round",
  "problem-statements": "New Problem Statement",
};

export default function AdminSectionPage() {
  useAdminGuard();
  const toast = useToast();
  const { section } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const key = section as SectionKey | undefined;
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | number | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingRow, setEditingRow] = useState<Row | null>(null);
  const teamIdFilter = searchParams.get("teamId") ?? "";

  const title = useMemo(() => {
    if (!key || !(key in labels)) return "Admin";
    return labels[key];
  }, [key]);

  const loadRows = useCallback(async () => {
    if (!key || key === "payments") {
      setRows([]);
      return;
    }

    const loader = listLoaders[key];
    if (!loader) return;

    setLoading(true);
    setError("");

    const params: Record<string, string> = {};
    if (key === "participants" && teamIdFilter) {
      params.teamId = teamIdFilter;
    }

    try {
      const data = key === "participants"
        ? ((await adminService.getParticipants(params)) as Row[])
        : await loader();
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [key, teamIdFilter]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const filteredRows = useMemo(() => {
    if (!query.trim()) return rows;
    const needle = query.toLowerCase();
    return rows.filter((row) =>
      Object.entries(row).some(([, value]) =>
        stringify(value).toLowerCase().includes(needle)
      )
    );
  }, [query, rows]);

  const closeModal = () => {
    setModalMode(null);
    setEditingRow(null);
  };

  const handleCreate = async (input: unknown) => {
    if (key === "domains") await adminService.createDomain(input as never);
    else if (key === "colleges") await adminService.createCollege(input as never);
    else if (key === "rounds") await adminService.createRound(input as never);
    else if (key === "problem-statements") await adminService.createProblemStatement(input as never);
    toast.success(`${labels[key as SectionKey].slice(0, -1)} created.`);
    closeModal();
    loadRows();
  };

  const handleUpdate = async (input: unknown) => {
    const id = Number(editingRow?.id);
    if (key === "domains") await adminService.updateDomain(id, input as never);
    else if (key === "colleges") await adminService.updateCollege(id, input as never);
    else if (key === "rounds") await adminService.updateRound(id, input as never);
    else if (key === "problem-statements") await adminService.updateProblemStatement(id, input as never);
    toast.success(`${labels[key as SectionKey].slice(0, -1)} updated.`);
    closeModal();
    loadRows();
  };

  const handleToggle = async (row: Row) => {
    const id = Number(row.id);
    try {
      if (key === "domains") {
        await adminService.toggleDomainStatus(id, !(row.isActive as boolean));
      } else if (key === "colleges") {
        await adminService.toggleCollegeStatus(id, !(row.isActive as boolean));
      } else if (key === "problem-statements") {
        await adminService.publishProblemStatement(id, !(row.isPublished as boolean));
      }
      toast.success("Status updated.");
      loadRows();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update status."));
    }
  };

  const handleTeamStatusChange = async (row: Row, status: TeamStatus) => {
    if (status === "CANCELLED" && !window.confirm(`Cancel team "${row.teamName}"? This can be undone later, but the team won't count toward confirmed registrations.`)) {
      return;
    }
    try {
      await adminService.updateTeamStatus(Number(row.id), status);
      toast.success(`Team status updated to ${status.replace("_", " ").toLowerCase()}.`);
      loadRows();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update team status."));
    }
  };

  return (
    <AdminShell
      title={title}
      subtitle={
        key === "teams"
          ? "Scan team status, review members, and jump into details without wading through a dense table."
          : key === "participants"
            ? "Search participants quickly and inspect verification and college context."
            : key === "payments"
              ? "Payment records collected via Razorpay. Read-only here for now."
              : "Manage records in a clean, mobile-friendly card layout."
      }
      primaryAction={
        key && CRUD_SECTIONS.includes(key) ? (
          <button
            type="button"
            onClick={() => setModalMode("create")}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 px-4 text-sm font-semibold text-white transition hover:brightness-110"
          >
            + {createLabels[key] ?? "New"}
          </button>
        ) : key !== "payments" ? (
          <div className="rounded-2xl border border-purple-400/25 bg-purple-500/10 px-3 py-2 text-sm text-purple-100">
            {rows.length} records
          </div>
        ) : null
      }
    >
      {key === "payments" ? (
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-6 text-white/70">
          Payments are recorded automatically once Razorpay checkout completes. A dedicated management view isn't wired up yet.
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

                    {key === "teams" ? (
                      <label className="mt-3 grid gap-1 text-xs text-white/50">
                        Status
                        <select
                          value={String(row.status ?? "DRAFT")}
                          onChange={(e) => handleTeamStatusChange(row, e.target.value as TeamStatus)}
                          className="h-10 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-purple-400/50"
                        >
                          {TEAM_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}

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
                      {key && CRUD_SECTIONS.includes(key) ? (
                        <button
                          className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-sm font-medium text-white/85 transition hover:border-white/20 hover:bg-white/10"
                          onClick={() => {
                            setEditingRow(row);
                            setModalMode("edit");
                          }}
                        >
                          Edit
                        </button>
                      ) : null}
                      {key === "domains" || key === "colleges" ? (
                        <button
                          className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-sm font-medium text-white/85 transition hover:border-white/20 hover:bg-white/10"
                          onClick={() => handleToggle(row)}
                        >
                          {row.isActive === false ? "Activate" : "Deactivate"}
                        </button>
                      ) : null}
                      {key === "problem-statements" ? (
                        <button
                          className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-sm font-medium text-white/85 transition hover:border-white/20 hover:bg-white/10"
                          onClick={() => handleToggle(row)}
                        >
                          {row.isPublished ? "Unpublish" : "Publish"}
                        </button>
                      ) : null}
                    </div>

                    {isOpen ? (
                      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
                        {Object.entries(row)
                          .filter(([field]) => field !== "passwordHash" && field !== "razorpaySignature")
                          .map(([field, value]) => (
                            <div key={field} className="flex items-start justify-between gap-3 border-b border-white/5 py-2 last:border-b-0">
                              <span className="text-white/45">{formatKey(field)}</span>
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

      {modalMode && key === "domains" ? (
        <Modal title={modalMode === "create" ? "New Domain" : "Edit Domain"} onClose={closeModal}>
          <DomainForm
            initial={modalMode === "edit" ? (editingRow as unknown as Domain) : undefined}
            onSubmit={modalMode === "create" ? handleCreate : handleUpdate}
            onCancel={closeModal}
          />
        </Modal>
      ) : null}

      {modalMode && key === "colleges" ? (
        <Modal title={modalMode === "create" ? "New College" : "Edit College"} onClose={closeModal}>
          <CollegeForm
            initial={modalMode === "edit" ? (editingRow as unknown as College) : undefined}
            onSubmit={modalMode === "create" ? handleCreate : handleUpdate}
            onCancel={closeModal}
          />
        </Modal>
      ) : null}

      {modalMode && key === "rounds" ? (
        <Modal title={modalMode === "create" ? "New Round" : "Edit Round"} onClose={closeModal}>
          <RoundForm
            initial={modalMode === "edit" ? (editingRow as unknown as Round) : undefined}
            onSubmit={modalMode === "create" ? handleCreate : handleUpdate}
            onCancel={closeModal}
          />
        </Modal>
      ) : null}

      {modalMode && key === "problem-statements" ? (
        <Modal title={modalMode === "create" ? "New Problem Statement" : "Edit Problem Statement"} onClose={closeModal}>
          <ProblemStatementForm
            initial={modalMode === "edit" ? (editingRow as unknown as ProblemStatement) : undefined}
            onSubmit={modalMode === "create" ? handleCreate : handleUpdate}
            onCancel={closeModal}
          />
        </Modal>
      ) : null}
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
    .filter(([field]) => field !== "id")
    .slice(0, 3)
    .map(([field, value]) => `${formatKey(field)}: ${stringify(value)}`);
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
