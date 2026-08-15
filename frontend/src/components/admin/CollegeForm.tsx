import { useState, type FormEvent } from "react";
import type { College, CollegeInput } from "../../services/admin.service";
import { fieldClass, labelClass, primaryButtonClass, secondaryButtonClass } from "./formStyles";

export function CollegeForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: College;
  onSubmit: (input: CollegeInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [collegeId, setCollegeId] = useState(initial?.collegeId ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [university, setUniversity] = useState(initial?.university ?? "");
  const [region, setRegion] = useState(initial?.region ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (!initial && collegeId.trim().length < 1) {
      setError("College ID is required.");
      return;
    }
    if (name.trim().length < 1) {
      setError("Name is required.");
      return;
    }
    if (region.trim().length < 1) {
      setError("Region is required.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        collegeId: collegeId.trim(),
        name: name.trim(),
        university: university.trim(),
        region: region.trim(),
        isActive,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save college.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      {!initial ? (
        <label className={labelClass}>
          College ID
          <input className={fieldClass} value={collegeId} onChange={(e) => setCollegeId(e.target.value)} />
        </label>
      ) : null}

      <label className={labelClass}>
        Name
        <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <label className={labelClass}>
        University
        <input className={fieldClass} value={university} onChange={(e) => setUniversity(e.target.value)} />
      </label>

      <label className={labelClass}>
        Region
        <input className={fieldClass} value={region} onChange={(e) => setRegion(e.target.value)} />
      </label>

      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-purple-500 focus:ring-purple-400"
        />
        Active
      </label>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="mt-2 grid grid-cols-2 gap-3">
        <button type="button" onClick={onCancel} className={secondaryButtonClass}>
          Cancel
        </button>
        <button type="submit" disabled={submitting} className={primaryButtonClass}>
          {submitting ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
