import { useEffect, useMemo, useState } from "react";
import { adminService } from "../../services/admin.service";
import { useAdminGuard } from "../../hooks/useAdminGuard";
import AdminShell from "./AdminShell";

type DashboardData = {
  totalTeams: number;
  totalParticipants: number;
  verifiedParticipants: number;
  unverifiedParticipants: number;
  totalRegistrations: number;
  confirmedRegistrations: number;
  pendingRegistrations: number;
  cancelledRegistrations: number;
  totalPayments: number;
  successfulPayments: number;
  pendingPayments: number;
  failedPayments: number;
  registrationsByDomain: Array<{ domainName: string; total: number }>;
  recentRegistrations: Array<{
    teamId: string;
    registrationId: string | null;
    teamName: string;
    status: string;
    createdAt: string;
    domainName: string;
  }>;
};

const cardStyles = "rounded-[24px] border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(8,15,35,0.25)]";

export default function AdminDashboard() {
  useAdminGuard();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    adminService
      .getDashboard()
      .then((result) => {
        if (active) setData(result as unknown as DashboardData);
      })
      .catch(() => {
        // A 401 is already handled globally (see the axios interceptor in
        // services/api.ts), which redirects to login. Anything else is a
        // genuine failure worth surfacing.
        if (active) setError("Failed to load dashboard data.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const summaryCards = useMemo(
    () => [
      { label: "Teams", value: data?.totalTeams ?? 0, tone: "from-purple-500/20 to-purple-500/5" },
      { label: "Participants", value: data?.totalParticipants ?? 0, tone: "from-blue-500/20 to-blue-500/5" },
      { label: "Verified", value: data?.verifiedParticipants ?? 0, tone: "from-emerald-500/20 to-emerald-500/5" },
      { label: "Pending registrations", value: data?.pendingRegistrations ?? 0, tone: "from-amber-500/20 to-amber-500/5" },
      { label: "Confirmed registrations", value: data?.confirmedRegistrations ?? 0, tone: "from-cyan-500/20 to-cyan-500/5" },
      { label: "Successful payments", value: data?.successfulPayments ?? 0, tone: "from-blue-500/20 to-purple-500/5" },
    ],
    [data]
  );

  return (
    <AdminShell
      title="Dashboard"
      subtitle="A quick overview of registration health, team activity, and what needs attention right now."
    >
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className={`${cardStyles} animate-pulse`}>
              <div className="h-3 w-24 rounded-full bg-white/10" />
              <div className="mt-4 h-8 w-20 rounded-full bg-white/10" />
              <div className="mt-6 h-2 w-full rounded-full bg-white/10" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-[24px] border border-red-400/20 bg-red-500/10 p-6 text-sm text-red-100">
          {error}
        </div>
      ) : (
        <div className="grid gap-5">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {summaryCards.map((card) => (
              <article key={card.label} className={`${cardStyles} bg-gradient-to-br ${card.tone}`}>
                <p className="text-sm text-white/65">{card.label}</p>
                <h3 className="mt-3 text-4xl font-semibold tracking-tight">{card.value}</h3>
              </article>
            ))}
          </section>

          <section className={`${cardStyles}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-white/60">Registration overview</p>
                <h3 className="mt-1 text-lg font-semibold">Current state</h3>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Total registrations", data?.totalRegistrations ?? 0],
                ["Confirmed", data?.confirmedRegistrations ?? 0],
                ["Pending", data?.pendingRegistrations ?? 0],
                ["Cancelled", data?.cancelledRegistrations ?? 0],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-white/45">{label}</p>
                  <p className="mt-2 text-2xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <section className={`${cardStyles}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-white/60">Domain distribution</p>
                  <h3 className="mt-1 text-lg font-semibold">Where registrations are coming from</h3>
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                {(data?.registrationsByDomain ?? []).length === 0 ? (
                  <p className="text-sm text-white/60">No domain data yet.</p>
                ) : (
                  data?.registrationsByDomain.map((item) => (
                    <div key={item.domainName} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium">{item.domainName}</span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                          {item.total}
                        </span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
                          style={{ width: `${Math.min(item.total * 12, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className={`${cardStyles}`}>
              <div>
                <p className="text-sm text-white/60">Recent registrations</p>
                <h3 className="mt-1 text-lg font-semibold">Latest activity</h3>
              </div>
              <div className="mt-5 grid gap-3">
                {(data?.recentRegistrations ?? []).length === 0 ? (
                  <p className="text-sm text-white/60">No recent registrations.</p>
                ) : (
                  data?.recentRegistrations.map((item) => (
                    <article key={item.teamId} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{item.teamName}</p>
                          <p className="mt-1 text-sm text-white/60">{item.domainName}</p>
                        </div>
                        <StatusBadge status={item.status} />
                      </div>
                      <p className="mt-3 text-xs text-white/45">
                        {item.registrationId ? `Reg ID ${item.registrationId}` : "Registration ID pending"}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "CONFIRMED"
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
      : status === "CANCELLED"
        ? "border-red-400/30 bg-red-500/10 text-red-100"
        : "border-amber-400/30 bg-amber-500/10 text-amber-100";

  return (
    <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.2em] ${tone}`}>
      {status.toLowerCase()}
    </span>
  );
}
