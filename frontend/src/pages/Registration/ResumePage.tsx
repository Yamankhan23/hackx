import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { resumeApplication } from "../../services/registration.service";
import { createPaymentOrder, verifyPayment } from "../../services/payment.service";
import { useToast } from "../../hooks/useToast";
import { getApiErrorMessage } from "../../lib/apiError";
import type { ResumeApplicationResponse } from "../../types/registration";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: ResumeApplicationResponse };

export function ResumePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, setState] = useState<LoadState>(() =>
    token
      ? { status: "loading" }
      : { status: "error", message: "This resume link is invalid or missing a token." }
  );
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    resumeApplication(token)
      .then((response) => {
        if (!cancelled) {
          setState({ status: "ready", data: response.data });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            status: "error",
            message: getApiErrorMessage(error, "Failed to load your application draft."),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state.status === "loading") {
    return (
      <Shell>
        <p className="text-sm text-slate-400">Checking your application...</p>
      </Shell>
    );
  }

  if (state.status === "error") {
    return (
      <Shell>
        <Card>
          <Eyebrow>Resume Application</Eyebrow>
          <h1 className="mt-2 text-2xl font-semibold">Link invalid or expired</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">{state.message}</p>
          <HomeButton />
        </Card>
      </Shell>
    );
  }

  const { data } = state;

  if (data.alreadySubmitted && data.status === "PENDING_PAYMENT" && !confirmed) {
    return (
      <Shell>
        <PaymentCard
          token={token}
          data={data}
          onConfirmed={() => setConfirmed(true)}
        />
      </Shell>
    );
  }

  if (data.alreadySubmitted && (data.status === "CONFIRMED" || confirmed)) {
    return (
      <Shell>
        <Card>
          <Eyebrow>Resume Application</Eyebrow>
          <h1 className="mt-2 text-2xl font-semibold">Registration confirmed 🎉</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Your team's registration is confirmed. See you at MUSA CodeX 2026!
          </p>
          <TeamSummary team={data.team} />
          <HomeButton />
        </Card>
      </Shell>
    );
  }

  if (data.alreadySubmitted && data.status === "CANCELLED") {
    return (
      <Shell>
        <Card>
          <Eyebrow>Resume Application</Eyebrow>
          <h1 className="mt-2 text-2xl font-semibold">Registration cancelled</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            This registration has been cancelled. Contact the organizers if you believe this is a mistake.
          </p>
          <TeamSummary team={data.team} />
          <HomeButton />
        </Card>
      </Shell>
    );
  }

  if (data.alreadySubmitted) {
    return (
      <Shell>
        <Card>
          <Eyebrow>Resume Application</Eyebrow>
          <h1 className="mt-2 text-2xl font-semibold">Application already recorded</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Your details are already recorded. Contact admin for any query.
          </p>
          <TeamSummary team={data.team} />
          <HomeButton />
        </Card>
      </Shell>
    );
  }

  // Draft ready to reopen
  const draft = data.draft!;

  return (
    <Shell>
      <Card>
        <Eyebrow>Resume Application</Eyebrow>
        <h1 className="mt-2 text-2xl font-semibold">Welcome back!</h1>
        <p className="mt-2 text-sm text-slate-400">
          Your draft for <span className="font-medium text-white">{draft.teamName}</span> is ready.
        </p>

        <div className="mt-5 grid gap-3 rounded-2xl border border-slate-800 bg-slate-950/75 p-4 text-sm text-slate-300">
          <div className="flex items-center justify-between">
            <span>Team</span>
            <span className="font-medium text-white">{draft.teamName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Domain</span>
            <span className="font-medium text-white">{draft.domainName || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Status</span>
            <span className="font-medium text-purple-200">DRAFT</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Members</span>
            <span className="font-medium text-white">{draft.members.length}</span>
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          {draft.members.map((member, index) => (
            <div
              key={member.id ?? index}
              className="rounded-2xl border border-slate-800 bg-slate-950/75 p-4 text-sm"
            >
              <p className="font-semibold text-white">
                {member.role === "LEADER" ? "Team Leader" : `Member ${index + 1}`}
              </p>
              <p className="mt-1 text-slate-400">
                {member.fullName} · {member.email}
              </p>
            </div>
          ))}
        </div>

        <Link
          to={`/register?token=${encodeURIComponent(token)}`}
          className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-sm font-semibold text-white"
        >
          Reopen Draft Form
        </Link>
      </Card>
    </Shell>
  );
}

function PaymentCard({
  token,
  data,
  onConfirmed,
}: {
  token: string;
  data: ResumeApplicationResponse;
  onConfirmed: () => void;
}) {
  const toast = useToast();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const amount = data.payment?.amountRupees ?? 400;

  const handlePay = async () => {
    setError("");
    setPaying(true);

    try {
      const order = await createPaymentOrder(token);

      if (!window.Razorpay) {
        setError("Payment checkout failed to load. Please refresh and try again.");
        setPaying(false);
        return;
      }

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: Math.round(order.amount * 100),
        currency: order.currency,
        name: "MUSA CodeX 2026",
        description: `Registration fee — ${order.teamName}`,
        order_id: order.orderId,
        handler: (response) => {
          verifyPayment({
            token,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          })
            .then(() => {
              toast.success("Payment verified. Your team is confirmed!");
              onConfirmed();
            })
            .catch((err) => {
              toast.error(
                getApiErrorMessage(
                  err,
                  "We couldn't confirm your payment automatically. If money was deducted, contact support — we'll reconcile it shortly."
                )
              );
            })
            .finally(() => setPaying(false));
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
        theme: { color: "#7c3aed" },
      });

      checkout.open();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to start payment. Please try again."));
      setPaying(false);
    }
  };

  return (
    <Card>
      <Eyebrow>Resume Application</Eyebrow>
      <h1 className="mt-2 text-2xl font-semibold">All members verified! 🎉</h1>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        Complete the registration fee to confirm <span className="font-medium text-white">{data.team.teamName}</span>'s spot at MUSA CodeX 2026.
      </p>

      <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/75 p-4 text-sm text-slate-300">
        <div className="flex items-center justify-between">
          <span>Registration fee</span>
          <span className="text-lg font-semibold text-white">₹{amount}</span>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}

      <button
        type="button"
        onClick={handlePay}
        disabled={paying}
        className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {paying ? "Opening checkout..." : `Pay ₹${amount} Now`}
      </button>
    </Card>
  );
}

function TeamSummary({ team }: { team: ResumeApplicationResponse["team"] }) {
  return (
    <div className="mt-5 grid gap-3 rounded-2xl border border-slate-800 bg-slate-950/75 p-4 text-sm text-slate-300">
      <div className="flex items-center justify-between">
        <span>Team</span>
        <span className="font-medium text-white">{team.teamName}</span>
      </div>
      <div className="flex items-center justify-between">
        <span>Team ID</span>
        <span className="font-medium text-white">{team.teamId}</span>
      </div>
      <div className="flex items-center justify-between">
        <span>Status</span>
        <span className="font-medium text-purple-200">{team.status}</span>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#050816] px-4 py-6 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-2xl items-center justify-center">
        {children}
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full rounded-[28px] border border-purple-500/25 bg-slate-950/85 p-5">
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs uppercase tracking-[0.35em] text-purple-200/80">{children}</p>;
}

function HomeButton() {
  return (
    <Link
      to="/"
      className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-sm font-semibold text-white"
    >
      Back to Home
    </Link>
  );
}
