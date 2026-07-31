import { useCallback } from "react";
import type { FieldErrors, UseFormRegister, UseFormSetValue, UseFormGetValues } from "react-hook-form";
import type { RegistrationFormValues } from "../../schemas/registration.schema";
import type { College } from "../../types/registration";
import { cn } from "../../lib/utils";
import { SearchableCollegeSelect } from "./SearchableCollegeSelect";

type Props = {
  index: number;
  title: string;
  optional?: boolean;
  register: UseFormRegister<RegistrationFormValues>;
  errors: FieldErrors<RegistrationFormValues>;
  setValue: UseFormSetValue<RegistrationFormValues>;
  getValues: UseFormGetValues<RegistrationFormValues>;
  colleges: College[];
  showRemove?: boolean;
  onRemove?: () => void;
};

const memberFields: Array<[keyof RegistrationFormValues["members"][number], string]> = [
  ["fullName", "Full Name"],
  ["email", "Email"],
  ["mobileNumber", "Mobile Number"],
  ["region", "Region"],
  ["branch", "Branch"],
  ["yearOfStudy", "Year of Study"],
];

export function TeamMemberCard({
  index,
  title,
  optional,
  register,
  errors,
  setValue,
  getValues,
  colleges,
  showRemove,
  onRemove,
}: Props) {
  const memberErrors = errors.members?.[index];

  const handleCollegeSelect = useCallback(
    (college: College | null) => {
      if (college) {
        setValue(`members.${index}.selectedCollegeId`, college.collegeId);
        setValue(`members.${index}.selectedCollegeName`, college.name);
        setValue(`members.${index}.collegeName`, "");
      } else {
        setValue(`members.${index}.selectedCollegeId`, "");
        setValue(`members.${index}.selectedCollegeName`, "");
      }
    },
    [setValue, index]
  );

  const handleManualNameChange = useCallback(
    (name: string) => {
      setValue(`members.${index}.collegeName`, name);
    },
    [setValue, index]
  );

  const selectedCollegeName = getValues(`members.${index}.selectedCollegeName`) || "";
  const manualName = getValues(`members.${index}.collegeName`) || "";

  return (
    <section className="rounded-2xl border border-slate-800/90 bg-slate-950/75 p-4 shadow-[0_0_0_1px_rgba(168,85,247,0.08)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {optional ? <p className="text-xs text-slate-500">Optional member</p> : null}
        </div>
        {showRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:border-slate-500 hover:text-white"
          >
            Remove
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {memberFields.map(([field, label]) => (
          <label key={field} className={cn("grid gap-1.5", field === "yearOfStudy" ? "sm:col-span-2" : "")}>
            <span className="text-xs font-medium text-slate-300">{label}</span>
            <input
              {...register(`members.${index}.${field}`)}
              className="h-11 rounded-xl border border-slate-800 bg-slate-900/90 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20"
            />
            <span className="min-h-4 text-xs text-rose-300">
              {(memberErrors?.[field] as { message?: string } | undefined)?.message}
            </span>
          </label>
        ))}

        <label className="grid gap-1.5 sm:col-span-2">
          <span className="text-xs font-medium text-slate-300">College</span>
          <SearchableCollegeSelect
            colleges={colleges}
            value={selectedCollegeName}
            onSelect={handleCollegeSelect}
            onManualNameChange={handleManualNameChange}
            manualName={manualName}
            error={
              (memberErrors?.selectedCollegeId as { message?: string } | undefined)?.message ||
              (memberErrors?.selectedCollegeName as { message?: string } | undefined)?.message ||
              (memberErrors?.collegeName as { message?: string } | undefined)?.message
            }
          />

          {/* Hidden fields to store form state */}
          <input type="hidden" {...register(`members.${index}.selectedCollegeId`)} />
          <input type="hidden" {...register(`members.${index}.selectedCollegeName`)} />
          <input type="hidden" {...register(`members.${index}.collegeName`)} />
        </label>
      </div>
    </section>
  );
}
