import type { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";
import type { RegistrationFormValues } from "../../schemas/registration.schema";
import type { College } from "../../types/registration";
import { TeamMemberCard } from "./TeamMemberCard";

export function TeamMembersStep({
register,
  errors,
  setValue,
  watch,
  colleges,
  onAddMember,
  onRemoveMember,
  memberCount,
  lockLeaderEmail,
}: {
  register: UseFormRegister<RegistrationFormValues>;
  errors: FieldErrors<RegistrationFormValues>;
setValue: UseFormSetValue<RegistrationFormValues>;
  watch: UseFormWatch<RegistrationFormValues>;
  colleges: College[];
  onAddMember: () => void;
  onRemoveMember: (index: number) => void;
  memberCount: number;
  lockLeaderEmail?: boolean;
}) {
  const membersErrorsObj = errors.members as
    | { message?: string; root?: { message?: string } }
    | undefined;
  const membersError = membersErrorsObj?.root?.message ?? membersErrorsObj?.message;

  return (
    <div className="grid gap-4">
      {membersError ? (
        <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {membersError}
        </p>
      ) : null}

      {[0, 1, 2, 3].slice(0, memberCount).map((index) => (
        <TeamMemberCard
          key={index}
          index={index}
          title={index === 0 ? "Team Leader" : `Member ${index + 1}`}
          optional={index === 3}
register={register}
          errors={errors}
          setValue={setValue}
          watch={watch}
          colleges={colleges}
          showRemove={index === 3}
          onRemove={() => onRemoveMember(index)}
          disableEmail={index === 0 && lockLeaderEmail}
        />
      ))}

      {memberCount < 4 ? (
        <button
          type="button"
          onClick={onAddMember}
          className="h-11 rounded-xl border border-dashed border-purple-400/50 bg-purple-500/10 text-sm font-medium text-purple-200 transition hover:border-purple-300 hover:bg-purple-500/15"
        >
          + Add Member
        </button>
      ) : null}
    </div>
  );
}
