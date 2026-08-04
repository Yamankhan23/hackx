import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { resumeApplication } from "../../services/registration.service";
import type { ResumeApplicationResponse } from "../../types/registration";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: ResumeApplicationResponse };

export function ResumePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      setState({
        status: "error",
        message: "This resume link is invalid or missing a token.",
      });
      return;
    }

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
            message:
              error instanceof Error
                ? error.message
                : "Failed to load your application draft.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state.status === "loading") {
    return (
      <div className="min-h-screen bg-[#050816] px-4 py-6 text-white">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-2xl items-center justify-center">
          <p className="text-sm text-slate-400">Checking your application...</p>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="min-h-screen bg-[#050816] px-4 py-6 text-white">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-2xl items-center justify-center">
          <div className="w-full rounded-[28px] border border-purple-500/25 bg-slate-950/85 p-5">
            <p className="text-xs uppercase tracking-[0.35em] text-purple-200/80">Resume Application</p>
            <h1 className="mt-2 text-2xl font-semibold">Link invalid or expired</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">{state.message}</p>
            <Link
              to="/"
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-sm font-semibold text-white"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { data } = state;

  // Already submitted
  if (data.alreadySubmitted) {
    return (
      <div className="min-h-screen bg-[#050816] px-4 py-6 text-white">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-2xl items-center justify-center">
          <div className="w-full rounded-[28px] border border-purple-500/25 bg-slate-950/85 p-5">
            <p className="text-xs uppercase tracking-[0.35em] text-purple-200/80">Resume Application</p>

            {data.status === "PENDING_PAYMENT" ? (
              <>
                <h1 className="mt-2 text-2xl font-semibold">Your application has been submitted.</h1>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Your team registration has been received and is awaiting payment.
                  This page will be updated shortly with payment details.
                </p>
              </>
            ) : (
              <>
                <h1 className="mt-2 text-2xl font-semibold">Application already recorded</h1>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Your details are already recorded. Contact admin for any query.
                </p>
              </>
            )}

            <div className="mt-5 grid gap-3 rounded-2xl border border-slate-800 bg-slate-950/75 p-4 text-sm text-slate-300">
              <div className="flex items-center justify-between">
                <span>Team</span>
                <span className="font-medium text-white">{data.team.teamName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Team ID</span>
                <span className="font-medium text-white">{data.team.teamId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Status</span>
                <span className="font-medium text-purple-200">{data.team.status}</span>
              </div>
            </div>

            <Link
              to="/"
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-sm font-semibold text-white"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Draft ready to reopen
  const draft = data.draft!;

  return (
    <div className="min-h-screen bg-[#050816] px-4 py-6 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-2xl items-center justify-center">
        <div className="w-full rounded-[28px] border border-purple-500/25 bg-slate-950/85 p-5">
          <p className="text-xs uppercase tracking-[0.35em] text-purple-200/80">Resume Application</p>
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
        </div>
      </div>
    </div>
  );
}

