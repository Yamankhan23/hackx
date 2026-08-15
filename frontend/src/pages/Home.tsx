import { useState } from "react";
import { Navbar } from "../components/home/Navbar";
import { Hero } from "../components/home/Hero";
import { About } from "../components/home/About";
import { WhyParticipate } from "../components/home/WhyParticipate";
import { Domains } from "../components/home/Domains";
import { Timeline } from "../components/home/Timeline";
import { ProblemStatements } from "../components/home/ProblemStatements";
import { JudgingCriteria } from "../components/home/JudgingCriteria";
import { Prizes } from "../components/home/Prizes";
import { Rules } from "../components/home/Rules";
import { Sponsors } from "../components/home/Sponsors";
import { Faq } from "../components/home/Faq";
import { FinalCta } from "../components/home/FinalCta";
import { Footer } from "../components/home/Footer";
import { sendResumeLink } from "../services/registration.service";
import { getApiErrorMessage } from "../lib/apiError";

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
      setResumeError(getApiErrorMessage(error, "Something went wrong. Please try again."));
    } finally {
      setResumeLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050816] text-white">
      <Navbar />
      <main>
        <Hero />
        <About />
        <WhyParticipate />
        <Domains />
        <Timeline />
        <ProblemStatements />
        <JudgingCriteria />
        <Prizes />
        <Rules />
        <Sponsors />
        <Faq />

        {/* Continue your application */}
        <section id="continue" className="px-4 py-16 sm:px-6">
          <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950/70 p-5 text-left">
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
        </section>

        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
