import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { deleteTeamPpt, resumeApplication, uploadTeamPpt } from "../../services/registration.service";
import { createPaymentOrder, verifyPayment } from "../../services/payment.service";
import { useToast } from "../../hooks/useToast";
import { getApiErrorMessage } from "../../lib/apiError";
import { formatDateTime } from "../../lib/formatDate";
import type { PptSubmission, ResumeApplicationResponse } from "../../types/registration";

// Mirrors the backend's multer limit (see upload.middleware.ts) — checked
// client-side too so a leader isn't left waiting through a doomed upload of
// an oversized file before finding out.
const PPT_MAX_FILE_SIZE_BYTES = 35 * 1024 * 1024;

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

  // Draft or confirmed team, ready to view/edit
  const draft = data.draft!;

  return (
    <Shell>
      <Card>
        <Eyebrow>Resume Application</Eyebrow>
        <h1 className="mt-2 text-2xl font-semibold">Welcome back!</h1>
        <p className="mt-2 text-sm text-slate-400">
          <span className="font-medium text-white">{draft.teamName}</span> is ready.
        </p>

        {data.team.status === "DRAFT" && (
          <p className="mt-3 rounded-2xl border border-purple-500/25 bg-purple-500/10 p-3 text-sm text-purple-200">
            Check your email for a confirmation link to finalize your team's registration.
          </p>
        )}

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
            <span className="font-medium text-purple-200">{data.team.status}</span>
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
          Edit Team Details
        </Link>

        {data.team.status === "CONFIRMED" && (
          <PptUploadSection
            token={token}
            initialSubmission={data.team.pptSubmission ?? null}
          />
        )}
      </Card>
    </Shell>
  );
}

function PptUploadSection({
  token,
  initialSubmission,
}: {
  token: string;
  initialSubmission: PptSubmission | null;
}) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submission, setSubmission] = useState(initialSubmission);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  // Selecting a file only stages it — nothing is sent until the leader
  // explicitly confirms, so an accidental/wrong file pick never uploads
  // straight away.
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > PPT_MAX_FILE_SIZE_BYTES) {
      setError("File is too large. Maximum size is 35MB.");
      return;
    }

    setError("");
    setPendingFile(file);
  };

  const handleConfirmUpload = async () => {
    if (!pendingFile) return;

    setError("");
    setUploading(true);

    try {
      const result = await uploadTeamPpt(token, pendingFile);
      setSubmission({
        fileName: result.data.fileName,
        fileSizeBytes: result.data.fileSizeBytes,
        updatedAt: new Date().toISOString(),
      });
      setPendingFile(null);
      toast.success("PPT uploaded successfully.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to upload PPT. Please try again."));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!submission) return;
    if (!window.confirm(`Delete "${submission.fileName}"? You'll need to upload a new file before judging.`)) {
      return;
    }

    setError("");
    setDeleting(true);

    try {
      await deleteTeamPpt(token);
      setSubmission(null);
      toast.success("PPT deleted.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete PPT. Please try again."));
    } finally {
      setDeleting(false);
    }
  };

  const busy = uploading || deleting;

  return (
    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/75 p-4 text-sm">
      <p className="font-semibold text-white">Presentation (PPT)</p>

      {pendingFile ? (
        <div className="mt-2 rounded-xl border border-purple-500/25 bg-purple-500/10 p-3">
          <p className="truncate text-slate-200">{pendingFile.name}</p>
          <p className="text-xs text-slate-400">
            {(pendingFile.size / (1024 * 1024)).toFixed(1)} MB · Ready to upload
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={uploading}
              onClick={handleConfirmUpload}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? "Uploading…" : "Confirm Upload"}
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={() => setPendingFile(null)}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-medium text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : submission ? (
        <div className="mt-2">
          <div className="min-w-0">
            <p className="truncate text-slate-300">{submission.fileName}</p>
            <p className="text-xs text-slate-500">
              {(submission.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB · Uploaded {formatDateTime(submission.updatedAt)}
            </p>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-purple-400/40 bg-purple-500/10 text-sm font-semibold text-purple-200 transition hover:bg-purple-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Replace
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleDelete}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 text-slate-400">No presentation uploaded yet.</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
            className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl border border-purple-400/40 bg-purple-500/10 text-sm font-semibold text-purple-200 transition hover:bg-purple-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Choose File
          </button>
        </>
      )}

      {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}

      <input
        ref={fileInputRef}
        type="file"
        accept=".ppt,.pptx,.pdf"
        onChange={handleFileChange}
        className="hidden"
        disabled={busy}
      />
      <p className="mt-2 text-center text-xs text-slate-500">
        Only .ppt, .pptx, or .pdf files are supported · Max size 35MB
      </p>
    </div>
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
        description: `Registration fee for ${order.teamName}`,
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
                  "We couldn't confirm your payment automatically. If money was deducted, contact support and we'll reconcile it shortly."
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
