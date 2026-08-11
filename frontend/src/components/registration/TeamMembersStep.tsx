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
}: {
  register: UseFormRegister<RegistrationFormValues>;
  errors: FieldErrors<RegistrationFormValues>;
setValue: UseFormSetValue<RegistrationFormValues>;
  watch: UseFormWatch<RegistrationFormValues>;
  colleges: College[];
  onAddMember: () => void;
  onRemoveMember: (index: number) => void;
  memberCount: number;
}) {
  return (
    <div className="grid gap-4">
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
