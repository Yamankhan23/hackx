import { cn } from "../../lib/utils";

const steps = ["01 Team Details", "02 Team Members", "03 Review"];

export function RegistrationSteps({ currentStep }: { currentStep: number }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-[11px] sm:text-sm">
      {steps.map((step, index) => {
        const active = currentStep === index + 1;
        const complete = currentStep > index + 1;

        return (
          <div
            key={step}
            className={cn(
              "rounded-xl border px-2 py-2 text-center transition",
              active
                ? "border-purple-400/70 bg-purple-500/15 text-white shadow-[0_0_0_1px_rgba(168,85,247,0.18)]"
                : complete
                  ? "border-slate-700 bg-slate-900/70 text-slate-200"
                  : "border-slate-800 bg-slate-950/60 text-slate-500"
            )}
          >
            {step}
          </div>
        );
      })}
    </div>
  );
}
