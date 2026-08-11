import { Link, useLocation } from "react-router-dom";

type LocationState = {
  teamId?: string;
  registrationId?: string;
  teamName?: string;
};

export function VerificationStatusPage() {
  const location = useLocation();
  const state = location.state as LocationState | null;

  return (
    <div className="min-h-screen bg-[#050816] px-4 py-6 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-2xl items-center justify-center">
        <div className="w-full rounded-[28px] border border-purple-500/25 bg-slate-950/85 p-5 shadow-[0_20px_80px_rgba(8,15,35,0.75)]">
          <p className="text-xs uppercase tracking-[0.35em] text-purple-200/80">Registration Created</p>
          <h1 className="mt-2 text-3xl font-semibold">Your team has been successfully registered.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Before you can proceed to payment, every team member must verify their email address.
          </p>

          <div className="mt-5 grid gap-3 rounded-2xl border border-slate-800 bg-slate-950/75 p-4 text-sm text-slate-300">
            <div className="flex items-center justify-between"><span>Team created</span><span>✓</span></div>
            <div className="flex items-center justify-between"><span>Email verification pending</span><span>●</span></div>
            <div className="flex items-center justify-between"><span>Payment</span><span>○</span></div>
            <div className="flex items-center justify-between"><span>Registration confirmed</span><span>○</span></div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/75 p-4 text-sm text-slate-300">
            <p className="font-medium text-white">Verification links sent</p>
            <p className="mt-1">We&apos;ve sent verification links to all team members.</p>
            {state?.teamId ? <p className="mt-2 text-xs text-slate-500">Team ID: {state.teamId}</p> : null}
            {state?.registrationId ? <p className="text-xs text-slate-500">Registration ID: {state.registrationId}</p> : null}
          </div>

          <Link
            to="/"
            className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-sm font-semibold text-white"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
