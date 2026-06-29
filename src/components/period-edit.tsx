"use client";

import { useActionState, useEffect, useRef } from "react";
import { editPeriod, type PeriodFormState } from "@/app/actions/periods";

const inputClass =
  "rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-violet-500";
const btnClass =
  "rounded-md border border-black/15 dark:border-white/20 px-2.5 py-1 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/10";
const dialogClass =
  "m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border border-black/10 bg-white p-5 text-black shadow-xl backdrop:bg-black/50 dark:border-white/15 dark:bg-neutral-900 dark:text-white";

export function PeriodEdit({
  entry,
  ownerId,
  today,
}: {
  entry: { id: string; startDate: string; endDate: string | null };
  ownerId: string;
  today: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState<PeriodFormState, FormData>(
    editPeriod,
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
      <button
        type="button"
        className={btnClass}
        onClick={() => ref.current?.showModal()}
      >
        Bearbeiten
      </button>

      <dialog ref={ref} className={dialogClass} onClick={closeOnBackdrop}>
        <form action={action} className="flex flex-col gap-3">
          <h3 className="text-base font-medium">Eintrag bearbeiten</h3>
          <input type="hidden" name="id" value={entry.id} />
          <input type="hidden" name="ownerId" value={ownerId} />

          <label className="flex flex-col gap-1 text-xs">
            <span className="text-black/60 dark:text-white/60">Blutung Beginn</span>
            <input
              type="date"
              name="startDate"
              defaultValue={entry.startDate}
              max={today}
              required
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-black/60 dark:text-white/60">Ende (leer = läuft noch)</span>
            <input
              type="date"
              name="endDate"
              defaultValue={entry.endDate ?? ""}
              max={today}
              className={inputClass}
            />
          </label>

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
