import { useCallback, useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { RegistrationSteps } from "../../components/registration/RegistrationSteps";
import { RegistrationReview } from "../../components/registration/RegistrationReview";
import { TeamDetailsStep } from "../../components/registration/TeamDetailsStep";
import { TeamMembersStep } from "../../components/registration/TeamMembersStep";
import {
  registrationSchema,
  type RegistrationFormValues,
} from "../../schemas/registration.schema";
import {
  fetchColleges,
  fetchDomains,
  registerTeam,
  resumeApplication,
  updateTeam,
} from "../../services/registration.service";
import { getApiErrorMessage } from "../../lib/apiError";
import type {
  College,
  Domain,
  RegisterTeamPayload,
  ResumeDraft,
} from "../../types/registration";
import { useToast } from "../../hooks/useToast";

const createEmptyMember = (role: "LEADER" | "MEMBER") => ({
  role,
  fullName: "",
  email: "",
  mobileNumber: "",
  selectedCollegeId: "",
  selectedCollegeName: "",
  collegeName: "",
  region: "",
  branch: "",
  yearOfStudy: "",
});

export function RegistrationPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const resumeToken = searchParams.get("token");

  const [step, setStep] = useState(1);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
const [generalError, setGeneralError] = useState("");
  const [loading, setLoading] = useState(false);
  const [domainsLoading, setDomainsLoading] = useState(true);
  const [resumeDraft, setResumeDraft] = useState<ResumeDraft | null>(null);
  const [resumeTeamId, setResumeTeamId] = useState<string | null>(null);
  const [isResuming, setIsResuming] = useState(Boolean(resumeToken));

  const form = useForm<RegistrationFormValues, unknown, RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      teamName: "",
      domainId: "",
      declarationAccepted: false,
      members: [
        createEmptyMember("LEADER"),
        createEmptyMember("MEMBER"),
        createEmptyMember("MEMBER"),
      ],
    },
    mode: "onTouched",
  });

  // `keyName: "fieldKey"` keeps react-hook-form's internal per-row key out
  // of the way of our own `id` field (the draft member's DB row id).
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "members",
    keyName: "fieldKey",
  });

  // Pre-fill the form from a resumed draft
  const applyResumeDraft = useCallback(
    (draft: ResumeDraft) => {
      form.reset({
        teamName: draft.teamName,
        domainId: String(draft.domainId),
        declarationAccepted: draft.declarationAccepted,
        members: draft.members.map((member) => ({
          id: member.id,
          role: member.role,
          fullName: member.fullName,
          email: member.email,
          mobileNumber: member.mobileNumber,
          selectedCollegeId: member.collegeId,
          selectedCollegeName: member.collegeName,
          collegeName: "",
          region: member.region,
          branch: member.branch,
          yearOfStudy: String(member.yearOfStudy),
        })),
      });
    },
    [form]
  );

useEffect(() => {
    Promise.all([
      fetchDomains()
        .then(setDomains)
        .catch(() => setGeneralError("Unable to load data right now."))
        .finally(() => setDomainsLoading(false)),
fetchColleges()
        .then(setColleges)
        .catch(() => setGeneralError("Unable to load data right now.")),
    ]).catch(() => setGeneralError("Unable to load data right now."));
  }, []);

  useEffect(() => {
    if (!resumeToken) {
      return;
    }

    let cancelled = false;

    resumeApplication(resumeToken)
      .then((response) => {
        if (cancelled) {
          return;
        }

        if (response.data.alreadySubmitted) {
          if (response.data.status === "PENDING_PAYMENT") {
            // Editing is over once verification is complete — send them to
            // the payment step instead of showing a dead-end error here.
            navigate(`/resume?token=${encodeURIComponent(resumeToken)}`, { replace: true });
            return;
          }

          setGeneralError(
            response.data.message ||
              "Your application has already been submitted."
          );
          setResumeDraft(null);
          setIsResuming(false);
          return;
        }

        if (response.data.draft) {
          setResumeDraft(response.data.draft);
          setResumeTeamId(response.data.team.teamId);
          applyResumeDraft(response.data.draft);
          setStep(3);
        } else {
          setGeneralError("Could not load your draft application.");
        }

        setIsResuming(false);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setGeneralError(getApiErrorMessage(error, "Failed to load your draft application."));
        setIsResuming(false);
      });

    return () => {
      cancelled = true;
    };
  }, [resumeToken, applyResumeDraft, navigate]);

  const selectedDomain = domains.find(
    (domain) => String(domain.id) === form.watch("domainId")
  );

  const addMember = () => append(createEmptyMember("MEMBER"));
  const removeMember = (index: number) => {
    if (fields.length > 3 && index === 3) {
      remove(index);
    }
  };

  const handleNext = async () => {
    setGeneralError("");
    const fieldsToValidate = step === 1 ? ["teamName", "domainId"] : ["members"];
    const valid = await form.trigger(fieldsToValidate as (keyof RegistrationFormValues)[]);
    if (valid) {
      setStep((current) => Math.min(3, current + 1));
    }
  };

const buildPayload = (values: RegistrationFormValues): RegisterTeamPayload => ({
    teamName: values.teamName,
    domainId: Number(values.domainId),
    declarationAccepted: Boolean(values.declarationAccepted),
    members: values.members.map((member) => ({
      id: member.id,
      role: member.role,
      fullName: member.fullName,
      email: member.email.toLowerCase(),
      mobileNumber: member.mobileNumber,
      college:
        member.selectedCollegeId
          ? { collegeId: member.selectedCollegeId }
          : { collegeName: member.collegeName || "" },
      region: member.region,
      branch: member.branch,
      yearOfStudy: Number(member.yearOfStudy),
    })),
  });

  const submitForm = form.handleSubmit(async (values) => {
    setGeneralError("");
    setLoading(true);

    try {
      if (resumeToken && resumeTeamId) {
        // Update the existing draft (no duplicate created). Uses the
        // resume token (not the guessable teamId) so only whoever holds
        // the emailed link can edit this team's draft.
        await updateTeam(resumeToken, buildPayload(values));
        toast.success("Draft saved.");
        navigate("/registration/verification", {
          state: {
            teamId: resumeTeamId,
            teamName: values.teamName,
          },
        });
      } else {
        const response = await registerTeam(buildPayload(values));
        toast.success("Registration submitted! Check your email to verify.");
        navigate("/registration/verification", {
          state: {
            teamId: response.data.teamId,
            teamName: response.data.teamName,
          },
        });
      }
    } catch (error) {
      setGeneralError(getApiErrorMessage(error, "Failed to save team registration."));
    } finally {
      setLoading(false);
    }
  });

  return (
    <div className="min-h-screen bg-[#050816] px-4 py-6 text-white sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col justify-center">
        <div className="mb-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-purple-200/80">
            MUSA CodeX 2026
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Build. Innovate. Impact.
          </h1>
        </div>

        <div className="rounded-[28px] border border-purple-500/25 bg-slate-950/85 p-4 shadow-[0_20px_80px_rgba(8,15,35,0.75)] backdrop-blur sm:p-6">
          <RegistrationSteps currentStep={step} />

          <div className="mt-5">
            <h2 className="text-2xl font-semibold">
              {resumeDraft ? "Continue your team registration" : "Create your team"}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {resumeDraft
                ? `Editing draft for "${resumeDraft.teamName}".`
                : "Register your team for MUSA CodeX 2026."}
            </p>
          </div>

          {generalError ? (
            <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
              {generalError}
            </div>
          ) : null}

          {isResuming ? (
            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/75 p-6 text-center text-sm text-slate-300">
              Loading your draft application...
            </div>
          ) : (
            <form className="mt-5 grid gap-4" onSubmit={submitForm}>
              {step === 1 ? (
                <TeamDetailsStep
                  register={form.register}
                  errors={form.formState.errors}
                  domains={domains}
                  value={form.watch("domainId")}
                  onChange={(value) =>
                    form.setValue("domainId", value, { shouldValidate: true })
                  }
                  domainsLoading={domainsLoading}
                />
              ) : null}

              {step === 2 ? (
                <TeamMembersStep
                  register={form.register}
                  errors={form.formState.errors}
                  setValue={form.setValue}
                  watch={form.watch}
                  colleges={colleges}
                  onAddMember={addMember}
                  onRemoveMember={removeMember}
                  memberCount={fields.length}
                />
              ) : null}

              {step === 3 ? (
                <>
                  <RegistrationReview values={form.getValues()} domain={selectedDomain} />

                  <label className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/75 p-4 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      {...form.register("declarationAccepted")}
                      className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-purple-500 focus:ring-purple-400"
                    />
                    <span>
                      I confirm that the information provided is accurate and complete, and I agree
                      to the MUSA CodeX 2026 registration terms.
                    </span>
                  </label>

                  {form.formState.errors.declarationAccepted ? (
                    <p className="text-sm text-rose-300">
                      Declaration acceptance is required.
                    </p>
                  ) : null}
                </>
              ) : null}

              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep((current) => current - 1)}
                    className="h-12 rounded-xl border border-slate-700 bg-transparent text-sm font-medium text-slate-200 transition hover:border-slate-500"
                  >
                    ← Back
                  </button>
                ) : null}

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="h-12 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(91,33,182,0.3)] transition hover:brightness-110"
                  >
                    Continue →
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="h-12 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(91,33,182,0.3)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70 sm:col-span-2"
                  >
                    {loading
                      ? "Saving..."
                      : resumeDraft
                        ? "Save & Continue"
                        : "Complete Registration"}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
