import { useState, type FormEvent } from "react";
import type { Domain, DomainInput } from "../../services/admin.service";
import { fieldClass, labelClass, primaryButtonClass, secondaryButtonClass } from "./formStyles";

export function DomainForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Domain;
  onSubmit: (input: DomainInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (name.trim().length < 1) {
      setError("Name is required.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), description: description.trim(), isActive });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save domain.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <label className={labelClass}>
        Name
        <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <label className={labelClass}>
        Description
        <textarea
          className={`${fieldClass} h-24 resize-none py-2`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
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
