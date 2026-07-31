import type { Domain, TeamFormValues } from "../../types/registration";

export function RegistrationReview({
  values,
  domain,
}: {
  values: TeamFormValues;
  domain?: Domain;
}) {
  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/75 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Team</p>
        <h3 className="mt-1 text-base font-semibold text-white">{values.teamName}</h3>
        <p className="mt-1 text-sm text-slate-400">{domain?.name ?? "Unknown domain"}</p>
      </div>

      <div className="grid gap-3">
        {values.members.map((member, index) => (
          <div key={index} className="rounded-2xl border border-slate-800 bg-slate-950/75 p-4">
            <p className="text-sm font-semibold text-white">
              {index === 0 ? "Team Leader" : `Member ${index + 1}`}
            </p>
            <div className="mt-2 grid gap-1 text-sm text-slate-400">
              <span>{member.fullName}</span>
              <span>{member.email}</span>
              <span>{member.mobileNumber}</span>
              <span>
                {member.selectedCollegeName || member.collegeName}
              </span>
              <span>
                {member.region} · {member.branch} · Year {member.yearOfStudy}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
