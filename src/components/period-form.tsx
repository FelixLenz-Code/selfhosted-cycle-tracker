"use client";

import { useActionState } from "react";
import { addPeriod, type PeriodFormState } from "@/app/actions/periods";

const inputClass =
  "rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-violet-500";

export function PeriodForm({ today, ownerId }: { today: string; ownerId: string }) {
  const [state, action, pending] = useActionState<PeriodFormState, FormData>(
    addPeriod,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="ownerId" value={ownerId} />
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Blutung Beginn</span>
          <input
            type="date"
            name="startDate"
            defaultValue={today}
            max={today}
            required
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Ende (optional)</span>
          <input type="date" name="endDate" max={today} className={inputClass} />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {pending ? "Speichern …" : "Eintragen"}
        </button>
      </div>
      {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
      <p className="text-xs text-black/50 dark:text-white/50">
        Ende leer lassen, wenn die Blutung noch andauert – du kannst es später ergänzen.
      </p>
    </form>
  );
}
