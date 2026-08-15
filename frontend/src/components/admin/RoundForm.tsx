import { useState, type FormEvent } from "react";
import type { Round, RoundInput } from "../../services/admin.service";
import { fieldClass, labelClass, primaryButtonClass, secondaryButtonClass } from "./formStyles";

const toDatetimeLocal = (iso: string | null): string => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toIso = (localValue: string): string | undefined => {
  if (!localValue) return undefined;
  const date = new Date(localValue);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

export function RoundForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Round;
  onSubmit: (input: RoundInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [roundId, setRoundId] = useState(initial?.roundId ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [roundNumber, setRoundNumber] = useState(String(initial?.roundNumber ?? ""));
  const [type, setType] = useState<Round["type"]>(initial?.type ?? "ONLINE");
  const [status, setStatus] = useState<Round["status"]>(initial?.status ?? "UPCOMING");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [startAt, setStartAt] = useState(toDatetimeLocal(initial?.startAt ?? null));
  const [endAt, setEndAt] = useState(toDatetimeLocal(initial?.endAt ?? null));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    const parsedNumber = Number(roundNumber);

    if (!initial && roundId.trim().length < 1) {
      setError("Round ID is required.");
      return;
    }
    if (name.trim().length < 1) {
      setError("Name is required.");
      return;
    }
    if (!Number.isInteger(parsedNumber) || parsedNumber < 1) {
      setError("Round number must be a positive whole number.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        roundId: roundId.trim(),
        name: name.trim(),
        roundNumber: parsedNumber,
        type,
        status,
        description: description.trim(),
        startAt: toIso(startAt),
        endAt: toIso(endAt),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save round.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      {!initial ? (
        <label className={labelClass}>
          Round ID
          <input className={fieldClass} value={roundId} onChange={(e) => setRoundId(e.target.value)} />
        </label>
      ) : null}

      <label className={labelClass}>
        Name
        <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className={labelClass}>
          Round number
          <input
            type="number"
            min={1}
            className={fieldClass}
            value={roundNumber}
            onChange={(e) => setRoundNumber(e.target.value)}
          />
        </label>

        <label className={labelClass}>
          Type
          <select
            className={fieldClass}
            value={type}
            onChange={(e) => setType(e.target.value as Round["type"])}
          >
            <option value="ONLINE">Online</option>
            <option value="OFFLINE">Offline</option>
          </select>
        </label>
      </div>

      <label className={labelClass}>
        Status
        <select
          className={fieldClass}
          value={status}
          onChange={(e) => setStatus(e.target.value as Round["status"])}
        >
          <option value="UPCOMING">Upcoming</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className={labelClass}>
          Starts at
          <input
            type="datetime-local"
            className={fieldClass}
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
          />
        </label>
        <label className={labelClass}>
          Ends at
          <input
            type="datetime-local"
            className={fieldClass}
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
          />
        </label>
      </div>

      <label className={labelClass}>
        Description
        <textarea
          className={`${fieldClass} h-24 resize-none py-2`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
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
