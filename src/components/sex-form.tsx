"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { addSexEntry, editSexEntry, type SexFormState } from "@/app/actions/sex";
import {
  SEX_TYPES,
  ORGASM_RESULTS,
  type SexEntry,
  type SexPerson,
} from "@/lib/sex";

const inputClass =
  "w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-violet-500";

// Segmentierte Auswahl: das Radio bleibt für Tastatur/Screenreader erhalten,
// sichtbar ist die gestylte Fläche daneben (peer-checked). Die Optionen liegen
// in einem Raster, damit sie auf schmalen Displays nicht hinter dem Label
// umbrechen und als Tippfläche groß genug bleiben.
const chipClass =
  "block cursor-pointer rounded-lg border border-black/15 px-2 py-2 text-center text-xs font-medium leading-tight transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-violet-500 peer-checked:border-transparent peer-checked:bg-gradient-to-r peer-checked:from-violet-600 peer-checked:to-fuchsia-600 peer-checked:text-white peer-disabled:cursor-not-allowed dark:border-white/20";

const optionLabelClass =
  "mb-1.5 block text-xs font-medium text-black/55 dark:text-white/55";

export function SexForm({
  ownerId,
  today,
  nowTime,
  people,
  entry,
  onDone,
}: {
  ownerId: string;
  today: string;
  nowTime: string; // "HH:MM"
  people: SexPerson[]; // Owner + verknüpfte Partner
  entry?: SexEntry; // gesetzt = Bearbeiten
  onDone?: () => void;
}) {
  const isEdit = Boolean(entry);
  const [state, action, pending] = useActionState<SexFormState, FormData>(
    isEdit ? editSexEntry : addSexEntry,
    undefined,
  );

  // Beteiligte, die inzwischen nicht mehr verknüpft sind, bleiben im bestehenden
  // Eintrag sichtbar – sonst würden sie beim Speichern still verschwinden.
  const options = useMemo<SexPerson[]>(() => {
    const list = [...people];
    for (const p of entry?.participants ?? []) {
      if (!list.some((c) => c.id === p.userId)) list.push({ id: p.userId, name: p.name });
    }
    return list;
  }, [people, entry]);

  // Neuer Eintrag: alle vorschlagen. Bearbeiten: genau die gespeicherten Personen.
  const [selected, setSelected] = useState<Set<string>>(
    () =>
      new Set(
        entry ? entry.participants.map((p) => p.userId) : options.map((p) => p.id),
      ),
  );

  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });
  useEffect(() => {
    if (state?.ok) doneRef.current?.();
  }, [state]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const formId = entry?.id ?? "new";

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="ownerId" value={ownerId} />
      {entry && <input type="hidden" name="id" value={entry.id} />}

      <div className="flex flex-wrap gap-3">
        <label className="flex min-w-36 flex-1 flex-col gap-1 text-sm">
          <span className="font-medium">Tag</span>
          <input
            type="date"
            name="occurredOn"
            defaultValue={entry?.occurredOn ?? today}
            max={today}
            required
            className={inputClass}
          />
        </label>
        <label className="flex min-w-28 flex-1 flex-col gap-1 text-sm">
          <span className="font-medium">Uhrzeit</span>
          <input
            type="time"
            name="occurredTime"
            defaultValue={entry?.occurredTime ?? nowTime}
            required
            className={inputClass}
          />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Wer war dabei?</span>
        <p className="-mt-1 text-xs text-black/50 dark:text-white/50">
          Abwählen graut die Person aus – Art und Orgasmus werden dann nicht
          gespeichert.
        </p>

        {options.length === 0 && (
          <p className="text-sm text-black/60 dark:text-white/60">
            Keine Personen verfügbar.
          </p>
        )}

        {options.map((person) => {
          const on = selected.has(person.id);
          const current = entry?.participants.find((p) => p.userId === person.id);
          return (
            <div
              key={person.id}
              className={`rounded-xl border p-3 transition-colors ${
                on
                  ? "border-violet-500/40 bg-violet-500/[0.05]"
                  : "border-black/10 bg-black/[0.02] opacity-55 dark:border-white/15 dark:bg-white/[0.03]"
              }`}
            >
              <label className="flex cursor-pointer items-center gap-2.5 py-0.5 text-sm font-medium">
                <input
                  type="checkbox"
                  name="participants"
                  value={person.id}
                  checked={on}
                  onChange={() => toggle(person.id)}
                  className="h-5 w-5 shrink-0 accent-violet-600"
                />
                <span className="min-w-0 truncate">{person.name}</span>
                {!on && (
                  <span className="shrink-0 text-xs font-normal text-black/45 dark:text-white/45">
                    nicht dabei
                  </span>
                )}
              </label>

              <fieldset disabled={!on} className="mt-3 flex flex-col gap-3">
                <div>
                  <span className={optionLabelClass}>Art</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {SEX_TYPES.map((t, i) => (
                      <div key={t.value}>
                        <input
                          type="radio"
                          id={`type-${formId}-${person.id}-${t.value}`}
                          name={`type-${person.id}`}
                          value={t.value}
                          defaultChecked={
                            current ? current.type === t.value : i === 0
                          }
                          className="peer sr-only"
                        />
                        <label
                          htmlFor={`type-${formId}-${person.id}-${t.value}`}
                          className={chipClass}
                        >
                          {t.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <span className={optionLabelClass}>Orgasmus</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {ORGASM_RESULTS.map((o, i) => (
                      <div key={o.value}>
                        <input
                          type="radio"
                          id={`orgasm-${formId}-${person.id}-${o.value}`}
                          name={`orgasm-${person.id}`}
                          value={o.value}
                          defaultChecked={
                            current ? current.orgasm === o.value : i === 0
                          }
                          className="peer sr-only"
                        />
                        <label
                          htmlFor={`orgasm-${formId}-${person.id}-${o.value}`}
                          className={chipClass}
                        >
                          {o.short}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </fieldset>
            </div>
          );
        })}
      </div>

      {state?.error && <p className="text-sm text-red-500">{state.error}</p>}

      {/* Bleibt beim Scrollen sichtbar – bei mehreren Personen ist die Liste
          auf dem Handy länger als der Dialog. */}
      <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:-mx-5 sm:px-5">
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="flex-1 rounded-lg border border-black/15 px-3 py-2.5 text-sm font-medium hover:bg-black/5 sm:flex-none dark:border-white/20 dark:hover:bg-white/10"
          >
            Abbrechen
          </button>
        )}
        <button
          type="submit"
          disabled={pending || selected.size === 0}
          className="btn-primary flex-1 py-2.5 disabled:opacity-60 sm:ml-auto sm:flex-none"
        >
          {pending ? "Speichern …" : isEdit ? "Änderungen speichern" : "Eintragen"}
        </button>
      </div>
    </form>
  );
}
