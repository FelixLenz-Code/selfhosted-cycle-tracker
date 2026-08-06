"use client";

import { useActionState } from "react";
import { addSexEntry, type SexFormState } from "@/app/actions/sex";
import { SEX_TYPES } from "@/lib/sex";

const inputClass =
  "rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-violet-500";

// Segmentierte Auswahl: das Radio bleibt für Tastatur/Screenreader erhalten,
// sichtbar ist die gestylte Pille daneben (peer-checked).
const chipClass =
  "block cursor-pointer rounded-full border border-black/15 px-3.5 py-1.5 text-sm font-medium transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-violet-500 peer-checked:border-transparent peer-checked:bg-gradient-to-r peer-checked:from-violet-600 peer-checked:to-fuchsia-600 peer-checked:text-white dark:border-white/20";

export function SexForm({
  today,
  nowTime,
  ownerId,
}: {
  today: string;
  nowTime: string; // "HH:MM"
  ownerId: string;
}) {
  const [state, action, pending] = useActionState<SexFormState, FormData>(
    addSexEntry,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="ownerId" value={ownerId} />

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Tag</span>
          <input
            type="date"
            name="occurredOn"
            defaultValue={today}
            max={today}
            required
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Uhrzeit</span>
          <input
            type="time"
            name="occurredTime"
            defaultValue={nowTime}
            required
            className={inputClass}
          />
        </label>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Art</legend>
        <div className="flex flex-wrap gap-2">
          {SEX_TYPES.map((t, i) => (
            <div key={t.value}>
              <input
                type="radio"
                id={`sex-type-${t.value}`}
                name="type"
                value={t.value}
                defaultChecked={i === 0}
                className="peer sr-only"
              />
              <label htmlFor={`sex-type-${t.value}`} className={chipClass}>
                {t.label}
              </label>
            </div>
          ))}
        </div>
      </fieldset>

      {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
      {state?.ok && !state.error && (
        <p className="text-sm text-green-600">Eingetragen.</p>
      )}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="btn-primary disabled:opacity-60"
        >
          {pending ? "Speichern …" : "Eintragen"}
        </button>
      </div>
    </form>
  );
}
