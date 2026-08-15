import { useEffect, useState, type FormEvent } from "react";
import { adminService, type Domain, type ProblemStatement, type ProblemStatementInput } from "../../services/admin.service";
import { fieldClass, labelClass, primaryButtonClass, secondaryButtonClass } from "./formStyles";

export function ProblemStatementForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: ProblemStatement;
  onSubmit: (input: ProblemStatementInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [problemStatementId, setProblemStatementId] = useState(initial?.problemStatementId ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [manualDomainId, setManualDomainId] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? false);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    adminService.getDomains().then(setDomains).catch(() => setDomains([]));
  }, []);

  // Derived, not stored: once domains load, fall back to matching the
  // problem statement's existing domain by name until the user picks one.
  const domainId =
    manualDomainId ??
    (initial?.domainName
      ? String(domains.find((domain) => domain.name === initial.domainName)?.id ?? "")
      : "");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (!initial && problemStatementId.trim().length < 1) {
      setError("Problem statement ID is required.");
      return;
    }
    if (title.trim().length < 1) {
      setError("Title is required.");
      return;
    }
    if (description.trim().length < 1) {
      setError("Description is required.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        problemStatementId: problemStatementId.trim(),
        title: title.trim(),
        description: description.trim(),
        domainId: domainId ? Number(domainId) : undefined,
        isPublished,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save problem statement.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      {!initial ? (
        <label className={labelClass}>
          Problem statement ID
          <input
            className={fieldClass}
            value={problemStatementId}
            onChange={(e) => setProblemStatementId(e.target.value)}
          />
        </label>
      ) : null}

      <label className={labelClass}>
        Title
        <input className={fieldClass} value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>

      <label className={labelClass}>
        Domain
        <select className={fieldClass} value={domainId} onChange={(e) => setManualDomainId(e.target.value)}>
          <option value="">No domain</option>
          {domains.map((domain) => (
            <option key={domain.id} value={domain.id}>
              {domain.name}
            </option>
          ))}
        </select>
      </label>

      <label className={labelClass}>
        Description
        <textarea
          className={`${fieldClass} h-28 resize-none py-2`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={isPublished}
          onChange={(e) => setIsPublished(e.target.checked)}
          className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-purple-500 focus:ring-purple-400"
        />
        Published
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
