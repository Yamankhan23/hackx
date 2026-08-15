import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminService } from "../../services/admin.service";
import { useAdminGuard } from "../../hooks/useAdminGuard";
import { StatusBadge } from "../../components/admin/StatusBadge";
import { formatDateTime } from "../../lib/formatDate";
import { formatMoney } from "../../lib/formatMoney";
import AdminShell from "./AdminShell";

type DashboardData = {
  totalTeams: number;
  totalParticipants: number;
  verifiedParticipants: number;
  unverifiedParticipants: number;
  confirmedRegistrations: number;
  pendingPaymentRegistrations: number;
  draftRegistrations: number;
  cancelledRegistrations: number;
  totalPayments: number;
  successfulPayments: number;
  pendingPayments: number;
  failedPayments: number;
  totalCollected: number;
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

const cardClass = "rounded-2xl border border-white/10 bg-white/5 p-4";

export default function AdminDashboard() {
  useAdminGuard();
  const navigate = useNavigate();
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

  const kpis = [
    { label: "Teams", value: data?.totalTeams ?? 0 },
    { label: "Confirmed", value: data?.confirmedRegistrations ?? 0 },
    { label: "Awaiting payment", value: data?.pendingPaymentRegistrations ?? 0, alert: (data?.pendingPaymentRegistrations ?? 0) > 0 },
    { label: "Collected", value: formatMoney(data?.totalCollected ?? 0) },
  ];

  return (
    <AdminShell title="Dashboard" subtitle="Registration and payment health at a glance.">
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className={`${cardClass} animate-pulse`}>
              <div className="h-3 w-20 rounded-full bg-white/10" />
              <div className="mt-3 h-7 w-16 rounded-full bg-white/10" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>
      ) : (
        <div className="grid gap-4">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((card) => (
              <article key={card.label} className={cardClass}>
                <p className="text-xs text-white/55">{card.label}</p>
                <h3 className={`mt-2 text-2xl font-semibold tracking-tight ${card.alert ? "text-amber-300" : "text-white"}`}>
                  {card.value}
                </h3>
              </article>
            ))}
          </section>

          {(data?.failedPayments ?? 0) > 0 ? (
            <button
              onClick={() => navigate("/admin/payments")}
              className="flex items-center justify-between gap-3 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-left text-sm text-red-100 transition hover:bg-red-500/15"
            >
              <span>
                <span className="font-semibold">{data?.failedPayments}</span> failed payment
                {data?.failedPayments === 1 ? "" : "s"} may need follow-up.
              </span>
              <span className="text-xs underline underline-offset-2">Review →</span>
            </button>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
            <section className={cardClass}>
              <h3 className="text-sm font-semibold text-white/85">Domains</h3>
              <div className="mt-3 grid gap-2">
                {(data?.registrationsByDomain ?? []).length === 0 ? (
                  <p className="text-sm text-white/50">No domain data yet.</p>
                ) : (
                  data?.registrationsByDomain.map((item) => {
                    const max = Math.max(...(data?.registrationsByDomain.map((d) => d.total) ?? [1]), 1);
                    return (
                      <div key={item.domainName}>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-white/75">{item.domainName}</span>
                          <span className="text-white/50">{item.total}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-purple-500"
                            style={{ width: `${(item.total / max) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className={cardClass}>
              <h3 className="text-sm font-semibold text-white/85">Recent registrations</h3>
              <div className="mt-3 grid gap-2">
                {(data?.recentRegistrations ?? []).length === 0 ? (
                  <p className="text-sm text-white/50">No recent registrations.</p>
                ) : (
                  data?.recentRegistrations.map((item) => (
                    <div key={item.teamId} className="flex items-start justify-between gap-3 border-b border-white/5 py-2 text-sm last:border-b-0">
                      <div>
                        <p className="font-medium text-white">{item.teamName}</p>
                        <p className="mt-0.5 text-xs text-white/45">
                          {item.domainName} · {formatDateTime(item.createdAt)}
                        </p>
                      </div>
                      <StatusBadge status={item.status} size="sm" />
                    </div>
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
