"use client";

import { useActionState, useEffect, useRef } from "react";
import { editSexEntry, type SexFormState } from "@/app/actions/sex";
import { SEX_TYPES, type SexEntry } from "@/lib/sex";

const inputClass =
  "rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-violet-500";
const btnClass =
  "rounded-md border border-black/15 dark:border-white/20 px-2.5 py-1 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/10";
const dialogClass =
  "m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border border-black/10 bg-white p-5 text-black shadow-xl backdrop:bg-black/50 dark:border-white/15 dark:bg-neutral-900 dark:text-white";
const chipClass =
  "block cursor-pointer rounded-full border border-black/15 px-3 py-1 text-xs font-medium transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-violet-500 peer-checked:border-transparent peer-checked:bg-gradient-to-r peer-checked:from-violet-600 peer-checked:to-fuchsia-600 peer-checked:text-white dark:border-white/20";

export function SexEdit({
  entry,
  ownerId,
  today,
}: {
  entry: SexEntry;
  ownerId: string;
  today: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState<SexFormState, FormData>(
    editSexEntry,
    undefined,
  );

  // Bei Erfolg den Dialog schließen (neue Objektreferenz pro Submit).
  useEffect(() => {
    if (state?.ok) ref.current?.close();
  }, [state]);

  function closeOnBackdrop(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === e.currentTarget) e.currentTarget.close();
  }

  return (
    <>
      <button type="button" className={btnClass} onClick={() => ref.current?.showModal()}>
        Bearbeiten
      </button>

      <dialog ref={ref} className={dialogClass} onClick={closeOnBackdrop}>
        <form action={action} className="flex flex-col gap-3">
          <h3 className="text-base font-medium">Eintrag bearbeiten</h3>
          <input type="hidden" name="id" value={entry.id} />
          <input type="hidden" name="ownerId" value={ownerId} />

          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-black/60 dark:text-white/60">Tag</span>
              <input
                type="date"
                name="occurredOn"
                defaultValue={entry.occurredOn}
                max={today}
                required
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-black/60 dark:text-white/60">Uhrzeit</span>
              <input
                type="time"
                name="occurredTime"
                defaultValue={entry.occurredTime}
                required
                className={inputClass}
              />
            </label>
          </div>

          <fieldset>
            <legend className="mb-1.5 text-xs text-black/60 dark:text-white/60">Art</legend>
            <div className="flex flex-wrap gap-2">
              {SEX_TYPES.map((t) => (
                <div key={t.value}>
                  <input
                    type="radio"
                    id={`sex-edit-${entry.id}-${t.value}`}
                    name="type"
                    value={t.value}
                    defaultChecked={t.value === entry.type}
                    className="peer sr-only"
                  />
                  <label htmlFor={`sex-edit-${entry.id}-${t.value}`} className={chipClass}>
                    {t.label}
                  </label>
                </div>
              ))}
            </div>
          </fieldset>

          {state?.error && <p className="text-xs text-red-600">{state.error}</p>}

          <div className="mt-1 flex justify-end gap-2">
            <button type="button" className={btnClass} onClick={() => ref.current?.close()}>
              Abbrechen
            </button>
            <button type="submit" disabled={pending} className="btn-primary disabled:opacity-50">
              {pending ? "Speichern …" : "Speichern"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
