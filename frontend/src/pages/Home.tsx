import { useState } from "react";
import { Link } from "react-router-dom";
import { sendResumeLink } from "../services/registration.service";

export default function Home() {
  const [resumeEmail, setResumeEmail] = useState("");
  const [resumeError, setResumeError] = useState("");
  const [resumeSuccess, setResumeSuccess] = useState("");
  const [resumeLoading, setResumeLoading] = useState(false);

  const handleSendResumeLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setResumeError("");
    setResumeSuccess("");

    if (!resumeEmail.trim()) {
      setResumeError("Please enter your email address.");
      return;
    }

    setResumeLoading(true);

    try {
      const result = await sendResumeLink(resumeEmail.trim());
      setResumeSuccess(
        result.message ||
          "If this email has a draft application, a resume link has been sent."
      );
      setResumeEmail("");
    } catch (error) {
      setResumeError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setResumeLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050816] px-4 py-6 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl flex-col items-center justify-center text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-purple-200/80">
          MUSA HackX 2026
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Build. Innovate. Impact.
        </h1>
        <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-400">
          Register your team for MUSA HackX 2026 and compete to build something amazing.
        </p>
        <Link
          to="/register"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-8 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(91,33,182,0.3)] transition hover:brightness-110"
        >
          Register Now {"->"}
        </Link>

        {/* Continue your application */}
        <div className="mt-10 w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950/70 p-5 text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-purple-200/80">
            Already started?
          </p>
          <h2 className="mt-1 text-lg font-semibold">Continue Your Application</h2>
          <p className="mt-1 text-sm text-slate-400">
            Enter the team leader&apos;s email to receive a link to resume your draft.
          </p>

          <form className="mt-4 grid gap-3" onSubmit={handleSendResumeLink}>
            <input
              type="email"
              value={resumeEmail}
              onChange={(e) => setResumeEmail(e.target.value)}
              placeholder="leader@example.com"
              className="h-12 w-full rounded-xl border border-slate-800 bg-slate-900/90 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20"
            />

            {resumeError ? (
              <p className="text-sm text-rose-300">{resumeError}</p>
            ) : null}

            {resumeSuccess ? (
              <p className="text-sm text-emerald-300">{resumeSuccess}</p>
            ) : null}

            <button
              type="submit"
              disabled={resumeLoading}
              className="h-12 rounded-xl border border-purple-400/40 bg-purple-500/10 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resumeLoading ? "Sending..." : "Send Resume Link"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
