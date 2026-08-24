import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { confirmRegistration } from "../../services/registration.service";
import { getApiErrorMessage } from "../../lib/apiError";
import type { ConfirmRegistrationResponse } from "../../types/registration";

type LoadState =
  | { status: "loading" }
  | { status: "expired" }
  | { status: "invalid" }
  | { status: "error"; message: string }
  | { status: "ready"; data: ConfirmRegistrationResponse };

export function ConfirmPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, setState] = useState<LoadState>(() =>
    token ? { status: "loading" } : { status: "invalid" }
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    confirmRegistration(token)
      .then((response) => {
        if (!cancelled) {
          setState({ status: "ready", data: response.data });
        }
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        const code = error.response?.data?.code as string | undefined;
        if (code === "TOKEN_EXPIRED") {
          setState({ status: "expired" });
        } else if (code === "INVALID_TOKEN") {
          setState({ status: "invalid" });
        } else {
          setState({
            status: "error",
            message: getApiErrorMessage(error, "Failed to confirm your registration."),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <Shell>
      <Card>
        {state.status === "loading" && <LoadingState />}
        {state.status === "ready" && <ReadyState data={state.data} token={token} />}
        {state.status === "expired" && <ExpiredState />}
        {state.status === "invalid" && <InvalidState />}
        {state.status === "error" && <ErrorState message={state.message} />}
      </Card>
    </Shell>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-600 border-t-purple-400" />
      <p className="text-sm text-slate-400">Confirming your registration…</p>
    </div>
  );
}

function ReadyState({
  data,
  token,
}: {
  data: ConfirmRegistrationResponse;
  token: string;
}) {
  return (
    <>
      <Eyebrow>{data.alreadyConfirmed ? "Already Confirmed" : "Registration Confirmed"}</Eyebrow>
      <h1 className="mt-2 text-2xl font-semibold">
        {data.alreadyConfirmed
          ? "Already confirmed 🎉"
          : "You're confirmed! 🎉"}
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        <span className="font-medium text-white">{data.team.teamName}</span>'s registration for
        MUSA CodeX 2026 — Round 1 is confirmed. See you there!
      </p>
      <Link
        to={`/resume?token=${encodeURIComponent(token)}`}
        className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-sm font-semibold text-white"
      >
        View / Edit Your Team
      </Link>
    </>
  );
}

function ExpiredState() {
  return (
    <>
      <Eyebrow>Link Expired</Eyebrow>
      <h1 className="mt-2 text-2xl font-semibold">Confirmation link expired</h1>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        This confirmation link has expired. Use the "Continue application" option on the
        homepage to request a new one.
      </p>
      <HomeButton />
    </>
  );
}

function InvalidState() {
  return (
    <>
      <Eyebrow>Invalid Link</Eyebrow>
      <h1 className="mt-2 text-2xl font-semibold">Invalid confirmation link</h1>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        This confirmation link is not valid. Please use the link from your confirmation email.
      </p>
      <HomeButton />
    </>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <>
      <Eyebrow>Error</Eyebrow>
      <h1 className="mt-2 text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-3 text-sm leading-6 text-slate-300">{message}</p>
      <HomeButton />
    </>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#050816] px-4 py-6 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-lg items-center justify-center">
        {children}
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full rounded-[28px] border border-purple-500/25 bg-slate-950/85 p-6 shadow-[0_20px_80px_rgba(8,15,35,0.75)]">
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
      className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl border border-slate-700 bg-transparent text-sm font-medium text-slate-200 transition hover:border-slate-500"
    >
      Back to home
    </Link>
  );
}
