import type { FieldErrors, UseFormRegister } from "react-hook-form";
import type { RegistrationFormValues } from "../../schemas/registration.schema";
import type { Domain } from "../../types/registration";

export function TeamDetailsStep({
  register,
  errors,
  domains,
}: {
  register: UseFormRegister<RegistrationFormValues>;
  errors: FieldErrors<RegistrationFormValues>;
  domains: Domain[];
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
        <select
          {...register("domainId")}
          className="h-12 rounded-xl border border-slate-800 bg-slate-900/90 px-3 text-sm text-white outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20"
        >
          <option value="">Choose domain</option>
          {domains.map((domain) => (
            <option key={domain.id} value={String(domain.id)}>
              {domain.name}
            </option>
          ))}
        </select>
        <span className="min-h-4 text-xs text-rose-300">{errors.domainId?.message}</span>
      </label>
    </div>
  );
}
