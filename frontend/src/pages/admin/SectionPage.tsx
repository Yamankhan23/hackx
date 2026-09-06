import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  adminService,
  getApiErrorMessage,
  getBlobApiErrorMessage,
  type College,
  type Domain,
  type ListMeta,
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
import { DataTable, type Column } from "../../components/admin/DataTable";
import { Pagination } from "../../components/admin/Pagination";
import { StatusBadge } from "../../components/admin/StatusBadge";
import { formatDateTime } from "../../lib/formatDate";
import { formatMoney } from "../../lib/formatMoney";
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

const PAGE_SIZE = 10;
const PAGINATED_SECTIONS: SectionKey[] = ["teams", "participants", "payments"];
const CRUD_SECTIONS: SectionKey[] = ["domains", "colleges", "rounds", "problem-statements"];
const TEAM_STATUSES: TeamStatus[] = ["DRAFT", "PENDING_PAYMENT", "CONFIRMED", "CANCELLED"];
const PAYMENT_STATUS_FILTERS = [
  { value: "SUCCESS", label: "Paid" },
  { value: "CREATED", label: "Pending" },
  { value: "FAILED", label: "Failed" },
  { value: "REFUNDED", label: "Refunded" },
];

const labels: Record<SectionKey, string> = {
  teams: "Teams",
  participants: "Participants",
  payments: "Payments",
  domains: "Domains",
  colleges: "Colleges",
  rounds: "Rounds",
  "problem-statements": "Problem Statements",
};

const subtitles: Partial<Record<SectionKey, string>> = {
  teams: "Scan team status, review members, and jump into details without wading through a dense table.",
  participants: "Search participants quickly and inspect verification and college context.",
  payments: "Who paid, what for, how much, and when. All synced from Razorpay.",
};

const listLoaders: Partial<Record<SectionKey, () => Promise<Row[]>>> = {
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

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function AdminSectionPage() {
  useAdminGuard();
  const toast = useToast();
  const { section } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const key = section as SectionKey | undefined;

  const [rows, setRows] = useState<Row[]>([]);
  const [meta, setMeta] = useState<ListMeta>({ page: 1, limit: PAGE_SIZE, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingRow, setEditingRow] = useState<Row | null>(null);
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<number>>(new Set());
  const [selectingRound2, setSelectingRound2] = useState(false);
  const [exportingTeams, setExportingTeams] = useState(false);
  const [exportingParticipants, setExportingParticipants] = useState(false);
  const teamIdFilter = searchParams.get("teamId") ?? "";

  const title = useMemo(() => (key && key in labels ? labels[key] : "Admin"), [key]);
  const isPaginated = key ? PAGINATED_SECTIONS.includes(key) : false;

  // Debounce free-text search before it hits the server-paginated endpoints —
  // client-filtered (CRUD) sections don't need this, they filter instantly.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  // Reset to page 1 whenever the active filters change — computed during
  // render (React's documented pattern for resetting state on a derived
  // change) rather than via a setState-in-effect.
  const filterSignature = `${key ?? ""}|${debouncedSearch}|${statusFilter}|${teamIdFilter}`;
  const [prevFilterSignature, setPrevFilterSignature] = useState(filterSignature);
  if (prevFilterSignature !== filterSignature) {
    setPrevFilterSignature(filterSignature);
    if (page !== 1) setPage(1);
  }

  const loadRows = useCallback(async () => {
    if (!key) return;
    setLoading(true);
    setError("");
    setSelectedTeamIds(new Set());

    try {
      if (key === "payments") {
        const result = await adminService.getPayments({
          page,
          limit: PAGE_SIZE,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
          ...(statusFilter ? { status: statusFilter } : {}),
        });
        setRows(result.data as unknown as Row[]);
        setMeta(result.meta);
      } else if (key === "teams") {
        const result = await adminService.getTeams({
          page,
          limit: PAGE_SIZE,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
          ...(statusFilter ? { status: statusFilter } : {}),
        });
        setRows(result.data);
        setMeta(result.meta);
      } else if (key === "participants") {
        const result = await adminService.getParticipants({
          page,
          limit: PAGE_SIZE,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
          ...(teamIdFilter ? { teamId: teamIdFilter } : {}),
        });
        setRows(result.data);
        setMeta(result.meta);
      } else {
        const loader = listLoaders[key];
        if (!loader) return;
        const data = await loader();
        setRows(data);
        setMeta({ page: 1, limit: Math.max(data.length, 1), total: data.length });
      }
    } catch {
      setError(`Failed to load ${title.toLowerCase()}.`);
    } finally {
      setLoading(false);
    }
  }, [key, page, debouncedSearch, statusFilter, teamIdFilter, title]);

  useEffect(() => {
    // Deferred to a microtask so the fetch's state updates don't run
    // synchronously within the effect body itself.
    void Promise.resolve().then(loadRows);
  }, [loadRows]);

  const filteredRows = useMemo(() => {
    if (!key || isPaginated || !search.trim()) return rows;
    const needle = search.toLowerCase();
    return rows.filter((row) => Object.values(row).some((value) => stringify(value).toLowerCase().includes(needle)));
  }, [key, isPaginated, search, rows]);

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
      if (key === "domains") await adminService.toggleDomainStatus(id, !(row.isActive as boolean));
      else if (key === "colleges") await adminService.toggleCollegeStatus(id, !(row.isActive as boolean));
      else if (key === "problem-statements") await adminService.publishProblemStatement(id, !(row.isPublished as boolean));
      toast.success("Status updated.");
      loadRows();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update status."));
    }
  };

  const handleTeamStatusChange = async (row: Row, status: TeamStatus) => {
    if (
      status === "CANCELLED" &&
      !window.confirm(`Cancel team "${row.teamName}"? This can be undone later, but the team won't count toward confirmed registrations.`)
    ) {
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

  const handleToggleTeamSelect = (id: number) => {
    setSelectedTeamIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectRound2 = async () => {
    const count = selectedTeamIds.size;
    if (
      count === 0 ||
      !window.confirm(
        `Select ${count} team${count === 1 ? "" : "s"} for Round 2? Each leader will immediately get an email with a ₹400 payment link.`
      )
    ) {
      return;
    }

    setSelectingRound2(true);
    try {
      const result = await adminService.selectTeamsForRound2([...selectedTeamIds]);
      const parts = [`${result.selected.length} selected`];
      if (result.skipped.length) parts.push(`${result.skipped.length} skipped`);
      if (result.failed.length) parts.push(`${result.failed.length} failed`);
      const summary = parts.join(", ");

      if (result.failed.length || result.skipped.length) {
        toast.info(`Round 2 selection: ${summary}.`);
      } else {
        toast.success(`Round 2 selection: ${summary}.`);
      }
      loadRows();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to select teams for Round 2."));
    } finally {
      setSelectingRound2(false);
    }
  };

  const handleExportTeams = async () => {
    setExportingTeams(true);
    try {
      const { blob, filename } = await adminService.exportTeams({
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      downloadBlob(blob, filename);
      toast.success("Teams report exported.");
    } catch (err) {
      toast.error(await getBlobApiErrorMessage(err, "Failed to export teams."));
    } finally {
      setExportingTeams(false);
    }
  };

  const handleExportParticipants = async () => {
    setExportingParticipants(true);
    try {
      const { blob, filename } = await adminService.exportParticipants({
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(teamIdFilter ? { teamId: teamIdFilter } : {}),
      });
      downloadBlob(blob, filename);
      toast.success("Participants report exported.");
    } catch (err) {
      toast.error(await getBlobApiErrorMessage(err, "Failed to export participants."));
    } finally {
      setExportingParticipants(false);
    }
  };

  const actionHandlers: ActionHandlers = {
    navigate,
    onTeamStatusChange: handleTeamStatusChange,
    onToggle: handleToggle,
    onEdit: (row) => {
      setEditingRow(row);
      setModalMode("edit");
    },
    selectedTeamIds,
    onToggleTeamSelect: handleToggleTeamSelect,
  };
  const columns = getColumns(key, actionHandlers);

  return (
    <AdminShell
      title={title}
      subtitle={key ? subtitles[key] ?? "Manage records in a clean, searchable list." : undefined}
      primaryAction={
        key && CRUD_SECTIONS.includes(key) ? (
          <button
            type="button"
            onClick={() => setModalMode("create")}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-4 text-sm font-semibold text-white transition hover:brightness-110"
          >
            + {createLabels[key] ?? "New"}
          </button>
        ) : (
          <div className="rounded-xl border border-purple-400/25 bg-purple-500/10 px-3 py-2 text-sm text-purple-100">
            {meta.total} {meta.total === 1 ? "record" : "records"}
          </div>
        )
      }
    >
      <div className="grid gap-4">
        {key === "participants" && teamIdFilter ? (
          <section className="flex items-center justify-between gap-3 rounded-2xl border border-purple-400/20 bg-purple-500/10 px-4 py-3 text-sm text-purple-100">
            <span>
              Showing participants for team <span className="font-semibold">{teamIdFilter}</span>
            </span>
            <button
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80"
              onClick={() => setSearchParams({})}
            >
              Clear
            </button>
          </section>
        ) : null}

        <section className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${title.toLowerCase()}`}
            className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-purple-400/40 sm:max-w-xs"
          />
          {key === "teams" ? (
            <StatusFilter value={statusFilter} onChange={setStatusFilter} options={TEAM_STATUSES.map((s) => ({ value: s, label: s.replace("_", " ") }))} />
          ) : null}
          {key === "payments" ? (
            <StatusFilter value={statusFilter} onChange={setStatusFilter} options={PAYMENT_STATUS_FILTERS} />
          ) : null}
          {key === "teams" ? (
            <button
              type="button"
              disabled={exportingTeams}
              onClick={handleExportTeams}
              className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 sm:ml-auto"
            >
              {exportingTeams ? "Exporting…" : "Export to Excel"}
            </button>
          ) : null}
          {key === "participants" ? (
            <button
              type="button"
              disabled={exportingParticipants}
              onClick={handleExportParticipants}
              className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 sm:ml-auto"
            >
              {exportingParticipants ? "Exporting…" : "Export to Excel"}
            </button>
          ) : null}
        </section>

        {key === "teams" && selectedTeamIds.size > 0 ? (
          <section className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-purple-400/25 bg-purple-500/10 px-4 py-3 sm:flex-row sm:items-center">
            <span className="text-sm text-purple-100">
              {selectedTeamIds.size} team{selectedTeamIds.size === 1 ? "" : "s"} selected
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedTeamIds(new Set())}
                className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-medium text-white/75 transition hover:bg-white/10"
              >
                Clear
              </button>
              <button
                type="button"
                disabled={selectingRound2}
                onClick={handleSelectRound2}
                className="h-9 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-4 text-xs font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {selectingRound2 ? "Selecting…" : "Select for Round 2"}
              </button>
            </div>
          </section>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>
        ) : (
          <DataTable
            columns={columns}
            rows={filteredRows}
            loading={loading}
            rowKey={(row, index) => String(row.id ?? row.teamId ?? row.paymentId ?? index)}
            emptyMessage={search || statusFilter ? "Try a different search or filter." : "Nothing here yet."}
            mobileTitle={key ? (row) => mobileTitleFor(key, row) : undefined}
            mobileBadge={key ? (row) => mobileBadgeFor(key, row) : undefined}
            mobileExtra={key ? (row) => mobileActionsFor(key, row, actionHandlers) : undefined}
          />
        )}

        {isPaginated && !error ? <Pagination page={meta.page} limit={meta.limit} total={meta.total} onPageChange={setPage} /> : null}
      </div>

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

function StatusFilter({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-purple-400/40"
    >
      <option value="">All statuses</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-[#081029]">
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function stringify(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Verified" : "Pending";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return `${value.length} items`;
  return JSON.stringify(value);
}

type ActionHandlers = {
  navigate: ReturnType<typeof useNavigate>;
  onTeamStatusChange: (row: Row, status: TeamStatus) => void;
  onToggle: (row: Row) => void;
  onEdit: (row: Row) => void;
  selectedTeamIds: Set<number>;
  onToggleTeamSelect: (id: number) => void;
};

function getColumns(key: SectionKey | undefined, handlers: ActionHandlers): Column<Row>[] {
  switch (key) {
    case "teams":
      return [
        {
          key: "select",
          header: "",
          desktopOnly: true,
          render: (row) => {
            const id = Number(row.id);
            const eligible = row.status === "CONFIRMED";
            return (
              <input
                type="checkbox"
                checked={handlers.selectedTeamIds.has(id)}
                disabled={!eligible}
                title={eligible ? "Select for Round 2" : "Only CONFIRMED teams can be selected for Round 2"}
                onChange={() => handlers.onToggleTeamSelect(id)}
                className="h-4 w-4 accent-purple-500 disabled:cursor-not-allowed disabled:opacity-30"
              />
            );
          },
        },
        {
          key: "team",
          header: "Team",
          render: (row) => (
            <div>
              <p className="font-medium text-white">{String(row.teamName ?? "—")}</p>
              <p className="text-xs text-white/45">{String(row.teamId ?? "—")}</p>
            </div>
          ),
        },
        { key: "domain", header: "Domain", render: (row) => String(row.domainName ?? "—") },
        { key: "members", header: "Members", render: (row) => String(row.memberCount ?? 0) },
        { key: "status", header: "Status", render: (row) => <StatusBadge status={String(row.status ?? "DRAFT")} /> },
        { key: "registered", header: "Registered", render: (row) => formatDateTime(row.createdAt as string) },
        {
          key: "actions",
          header: "Actions",
          align: "right",
          desktopOnly: true,
          render: (row) => (
            <div className="flex items-center justify-end gap-2">
              <select
                value={String(row.status ?? "DRAFT")}
                onChange={(e) => handlers.onTeamStatusChange(row, e.target.value as TeamStatus)}
                className="h-8 rounded-lg border border-white/10 bg-black/20 px-2 text-xs text-white outline-none focus:border-purple-400/50"
              >
                {TEAM_STATUSES.map((s) => (
                  <option key={s} value={s} className="bg-[#081029]">
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
              <button
                className="h-8 rounded-lg border border-white/10 bg-white/5 px-2 text-xs font-medium text-white/75 transition hover:bg-white/10"
                onClick={() => handlers.navigate(`/admin/participants?teamId=${encodeURIComponent(String(row.teamId ?? ""))}`)}
              >
                Members
              </button>
            </div>
          ),
        },
      ];

    case "participants":
      return [
        {
          key: "participant",
          header: "Participant",
          render: (row) => (
            <div>
              <p className="font-medium text-white">{String(row.name ?? "—")}</p>
              <p className="text-xs text-white/45">{String(row.email ?? "—")}</p>
            </div>
          ),
        },
        { key: "team", header: "Team", render: (row) => String(row.teamName ?? "—") },
        { key: "college", header: "College", render: (row) => String(row.college ?? "—") },
        { key: "year", header: "Year", render: (row) => String(row.yearOfStudy ?? "—") },
        { key: "verified", header: "Verified", render: (row) => <StatusBadge status={row.emailVerified ? "VERIFIED" : "UNVERIFIED"} /> },
        { key: "registered", header: "Registered", render: (row) => formatDateTime(row.createdAt as string) },
      ];

    case "payments":
      return [
        {
          key: "team",
          header: "Team",
          render: (row) => (
            <div>
              <p className="font-medium text-white">{String(row.teamName ?? "—")}</p>
              <p className="text-xs text-white/45">Registration fee</p>
            </div>
          ),
        },
        {
          key: "amount",
          header: "Amount",
          render: (row) => <span className="font-medium text-white">{formatMoney(Number(row.amount ?? 0), String(row.currency ?? "INR"))}</span>,
        },
        {
          key: "method",
          header: "Method",
          render: (row) => (row.method ? <span className="capitalize">{String(row.method)}</span> : <span className="text-white/35">—</span>),
        },
        {
          key: "when",
          header: "When",
          render: (row) =>
            row.paidAt ? (
              <div>
                <p>{formatDateTime(row.paidAt as string)}</p>
                <p className="text-[11px] text-white/40">Paid</p>
              </div>
            ) : (
              <div>
                <p>{formatDateTime(row.createdAt as string)}</p>
                <p className="text-[11px] text-white/40">Created</p>
              </div>
            ),
        },
        {
          key: "status",
          header: "Status",
          render: (row) => (
            <div>
              <StatusBadge status={String(row.status ?? "CREATED")} />
              {row.status === "FAILED" && row.failureReason ? (
                <p className="mt-1 max-w-[16rem] text-[11px] text-red-300/80">{String(row.failureReason)}</p>
              ) : null}
            </div>
          ),
        },
        {
          key: "reference",
          header: "Reference",
          render: (row) => (
            <div className="font-mono text-[11px] leading-relaxed text-white/50">
              <p>{String(row.paymentId ?? "—")}</p>
              {row.razorpayPaymentId ? <p className="break-all text-white/35">{String(row.razorpayPaymentId)}</p> : null}
            </div>
          ),
        },
      ];

    case "domains":
      return [
        { key: "name", header: "Name", render: (row) => <span className="font-medium text-white">{String(row.name ?? "—")}</span> },
        { key: "description", header: "Description", render: (row) => String(row.description ?? "—") },
        {
          key: "status",
          header: "Status",
          render: (row) => <StatusBadge status={row.isActive !== false ? "ACTIVE" : "INACTIVE"} />,
        },
        {
          key: "actions",
          header: "Actions",
          align: "right",
          desktopOnly: true,
          render: (row) => (
            <div className="flex items-center justify-end gap-2">
              <button className={actionBtn} onClick={() => handlers.onEdit(row)}>
                Edit
              </button>
              <button className={actionBtn} onClick={() => handlers.onToggle(row)}>
                {row.isActive === false ? "Activate" : "Deactivate"}
              </button>
            </div>
          ),
        },
      ];

    case "colleges":
      return [
        { key: "name", header: "Name", render: (row) => <span className="font-medium text-white">{String(row.name ?? "—")}</span> },
        { key: "collegeId", header: "College ID", render: (row) => String(row.collegeId ?? "—") },
        { key: "region", header: "Region", render: (row) => String(row.region ?? "—") },
        { key: "university", header: "University", render: (row) => String(row.university ?? "—") },
        { key: "status", header: "Status", render: (row) => <StatusBadge status={row.isActive !== false ? "ACTIVE" : "INACTIVE"} /> },
        {
          key: "actions",
          header: "Actions",
          align: "right",
          desktopOnly: true,
          render: (row) => (
            <div className="flex items-center justify-end gap-2">
              <button className={actionBtn} onClick={() => handlers.onEdit(row)}>
                Edit
              </button>
              <button className={actionBtn} onClick={() => handlers.onToggle(row)}>
                {row.isActive === false ? "Activate" : "Deactivate"}
              </button>
            </div>
          ),
        },
      ];

    case "rounds":
      return [
        { key: "name", header: "Name", render: (row) => <span className="font-medium text-white">{String(row.name ?? "—")}</span> },
        { key: "roundId", header: "Round ID", render: (row) => String(row.roundId ?? "—") },
        { key: "type", header: "Type", render: (row) => String(row.type ?? "—") },
        { key: "roundNumber", header: "Round #", render: (row) => String(row.roundNumber ?? "—") },
        { key: "status", header: "Status", render: (row) => <StatusBadge status={String(row.status ?? "UPCOMING")} /> },
        {
          key: "actions",
          header: "Actions",
          align: "right",
          desktopOnly: true,
          render: (row) => (
            <div className="flex items-center justify-end gap-2">
              <button className={actionBtn} onClick={() => handlers.onEdit(row)}>
                Edit
              </button>
            </div>
          ),
        },
      ];

    case "problem-statements":
      return [
        { key: "title", header: "Title", render: (row) => <span className="font-medium text-white">{String(row.title ?? "—")}</span> },
        { key: "problemStatementId", header: "Problem ID", render: (row) => String(row.problemStatementId ?? "—") },
        { key: "domain", header: "Domain", render: (row) => String(row.domainName ?? "—") },
        { key: "published", header: "Published", render: (row) => <StatusBadge status={row.isPublished ? "PUBLISHED" : "UNPUBLISHED"} /> },
        {
          key: "actions",
          header: "Actions",
          align: "right",
          desktopOnly: true,
          render: (row) => (
            <div className="flex items-center justify-end gap-2">
              <button className={actionBtn} onClick={() => handlers.onEdit(row)}>
                Edit
              </button>
              <button className={actionBtn} onClick={() => handlers.onToggle(row)}>
                {row.isPublished ? "Unpublish" : "Publish"}
              </button>
            </div>
          ),
        },
      ];

    default:
      return [];
  }
}

const actionBtn =
  "h-8 rounded-lg border border-white/10 bg-white/5 px-2 text-xs font-medium text-white/75 transition hover:bg-white/10";

function mobileTitleFor(key: SectionKey, row: Row) {
  if (key === "teams") return String(row.teamName ?? "Team");
  if (key === "participants") return String(row.name ?? "Participant");
  if (key === "payments") return String(row.teamName ?? "Payment");
  if (key === "domains") return String(row.name ?? "Domain");
  if (key === "colleges") return String(row.name ?? "College");
  if (key === "rounds") return String(row.name ?? "Round");
  if (key === "problem-statements") return String(row.title ?? "Problem Statement");
  return "Record";
}

function mobileBadgeFor(key: SectionKey, row: Row) {
  if (key === "teams") return <StatusBadge status={String(row.status ?? "DRAFT")} size="sm" />;
  if (key === "participants") return <StatusBadge status={row.emailVerified ? "VERIFIED" : "UNVERIFIED"} size="sm" />;
  if (key === "payments") return <StatusBadge status={String(row.status ?? "CREATED")} size="sm" />;
  if (key === "domains" || key === "colleges") return <StatusBadge status={row.isActive !== false ? "ACTIVE" : "INACTIVE"} size="sm" />;
  if (key === "rounds") return <StatusBadge status={String(row.status ?? "UPCOMING")} size="sm" />;
  if (key === "problem-statements") return <StatusBadge status={row.isPublished ? "PUBLISHED" : "UNPUBLISHED"} size="sm" />;
  return null;
}

function mobileActionsFor(key: SectionKey, row: Row, handlers: ActionHandlers) {
  if (key === "teams") {
    const id = Number(row.id);
    const eligible = row.status === "CONFIRMED";
    return (
      <div className="grid gap-2">
        <label className="flex items-center gap-2 text-sm text-white/75">
          <input
            type="checkbox"
            checked={handlers.selectedTeamIds.has(id)}
            disabled={!eligible}
            onChange={() => handlers.onToggleTeamSelect(id)}
            className="h-4 w-4 accent-purple-500 disabled:cursor-not-allowed disabled:opacity-30"
          />
          Select for Round 2
        </label>
        <select
          value={String(row.status ?? "DRAFT")}
          onChange={(e) => handlers.onTeamStatusChange(row, e.target.value as TeamStatus)}
          className="h-10 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-purple-400/50"
        >
          {TEAM_STATUSES.map((s) => (
            <option key={s} value={s} className="bg-[#081029]">
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
        <button
          className="h-10 rounded-xl border border-white/10 bg-white/5 text-sm font-medium text-white/85 transition hover:bg-white/10"
          onClick={() => handlers.navigate(`/admin/participants?teamId=${encodeURIComponent(String(row.teamId ?? ""))}`)}
        >
          View members
        </button>
      </div>
    );
  }

  if (CRUD_SECTIONS.includes(key)) {
    return (
      <div className="flex gap-2">
        <button className="h-10 flex-1 rounded-xl border border-white/10 bg-white/5 text-sm font-medium text-white/85 transition hover:bg-white/10" onClick={() => handlers.onEdit(row)}>
          Edit
        </button>
        {key === "domains" || key === "colleges" ? (
          <button className="h-10 flex-1 rounded-xl border border-white/10 bg-white/5 text-sm font-medium text-white/85 transition hover:bg-white/10" onClick={() => handlers.onToggle(row)}>
            {row.isActive === false ? "Activate" : "Deactivate"}
          </button>
        ) : null}
        {key === "problem-statements" ? (
          <button className="h-10 flex-1 rounded-xl border border-white/10 bg-white/5 text-sm font-medium text-white/85 transition hover:bg-white/10" onClick={() => handlers.onToggle(row)}>
            {row.isPublished ? "Unpublish" : "Publish"}
          </button>
        ) : null}
      </div>
    );
  }

  return null;
}
