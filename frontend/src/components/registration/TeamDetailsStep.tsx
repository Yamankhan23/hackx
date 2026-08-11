import type { FieldErrors, UseFormRegister } from "react-hook-form";
import type { RegistrationFormValues } from "../../schemas/registration.schema";
import type { Domain } from "../../types/registration";
import { DomainSelect } from "./DomainSelect";

export function TeamDetailsStep({
  register,
  errors,
  domains,
  value,
  onChange,
  domainsLoading,
}: {
  register: UseFormRegister<RegistrationFormValues>;
  errors: FieldErrors<RegistrationFormValues>;
  domains: Domain[];
  value: string;
  onChange: (value: string) => void;
  domainsLoading?: boolean;
}) {
  return (
    <div className="grid gap-4">
      <label className="grid gap-1.5">
        <span className="text-xs font-medium text-slate-300">Team Name</span>
        <input
          {...register("teamName")}
          className="h-12 rounded-xl border border-slate-800 bg-slate-900/90 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20"
          placeholder="Code Warriors"
        />
        <span className="min-h-4 text-xs text-rose-300">{errors.teamName?.message}</span>
      </label>

      <label className="grid gap-1.5">
        <span className="text-xs font-medium text-slate-300">Domain</span>
<DomainSelect
          domains={domains}
          value={value}
          onChange={onChange}
          loading={domainsLoading}
          error={errors.domainId?.message}
        />

        {/* Hidden field to keep domainId registered for validation/submission */}
        <input type="hidden" {...register("domainId")} />
      </label>
    </div>
  );
}
