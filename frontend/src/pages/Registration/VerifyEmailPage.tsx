import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../services/api";

type Status = "loading" | "success" | "expired" | "already_verified" | "invalid" | "error";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>("loading");
  const [name, setName] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("invalid");
      return;
    }

    api
      .get(`/teams/verify-email?token=${encodeURIComponent(token)}`)
      .then((res) => {
        if (res.data.code === "ALREADY_VERIFIED") {
          setStatus("already_verified");
        } else {
          setName(res.data.data?.name ?? "");
          setStatus("success");
        }
      })
      .catch((err) => {
        const code = err.response?.data?.code as string | undefined;
        if (code === "TOKEN_EXPIRED") {
          setStatus("expired");
        } else if (code === "INVALID_TOKEN") {
          setStatus("invalid");
        } else {
          setStatus("error");
        }
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[#050816] px-4 py-6 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-lg items-center justify-center">
        <div className="w-full rounded-[28px] border border-purple-500/25 bg-slate-950/85 p-6 shadow-[0_20px_80px_rgba(8,15,35,0.75)]">
          {status === "loading" && <LoadingState />}
          {status === "success" && <SuccessState name={name} />}
          {status === "already_verified" && <AlreadyVerifiedState />}
          {status === "expired" && <ExpiredState />}
          {status === "invalid" && <InvalidState />}
          {status === "error" && <ErrorState />}
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-600 border-t-purple-400" />
      <p className="text-sm text-slate-400">Verifying your email address…</p>
    </div>
  );
}

function SuccessState({ name }: { name: string }) {
  return (
    <>
      <p className="text-xs uppercase tracking-[0.35em] text-purple-200/80">Email Verified</p>
      <h1 className="mt-2 text-3xl font-semibold">
        {name ? `Welcome, ${name}!` : "Email verified!"}
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        Your email address has been successfully verified. Once all team members have verified
        their emails, your team can proceed to payment.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-sm font-semibold text-white"
      >
        Back to home
      </Link>
    </>
  );
}

function AlreadyVerifiedState() {
  return (
    <>
      <p className="text-xs uppercase tracking-[0.35em] text-purple-200/80">Already Verified</p>
      <h1 className="mt-2 text-3xl font-semibold">Email already verified</h1>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        This email address has already been verified. No further action is needed.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-sm font-semibold text-white"
      >
        Back to home
      </Link>
    </>
  );
}

function ExpiredState() {
  return (
    <>
      <p className="text-xs uppercase tracking-[0.35em] text-rose-300/80">Link Expired</p>
      <h1 className="mt-2 text-3xl font-semibold">Verification link expired</h1>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        This verification link has expired. Verification links are valid for 24 hours.
        Please ask your team leader to resend the verification emails.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl border border-slate-700 bg-transparent text-sm font-medium text-slate-200 transition hover:border-slate-500"
      >
        Back to home
      </Link>
    </>
  );
}

function InvalidState() {
  return (
    <>
      <p className="text-xs uppercase tracking-[0.35em] text-rose-300/80">Invalid Link</p>
      <h1 className="mt-2 text-3xl font-semibold">Invalid verification link</h1>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        This verification link is not valid. Please use the link from your verification email,
        or ask your team leader to resend the verification emails.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl border border-slate-700 bg-transparent text-sm font-medium text-slate-200 transition hover:border-slate-500"
      >
        Back to home
      </Link>
    </>
  );
}

function ErrorState() {
  return (
    <>
      <p className="text-xs uppercase tracking-[0.35em] text-rose-300/80">Error</p>
      <h1 className="mt-2 text-3xl font-semibold">Something went wrong</h1>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        We were unable to verify your email. Please try again or contact support.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl border border-slate-700 bg-transparent text-sm font-medium text-slate-200 transition hover:border-slate-500"
      >
        Back to home
      </Link>
    </>
  );
}
