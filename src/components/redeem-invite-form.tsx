"use client";

import { useActionState } from "react";
import { redeemInvite, type InviteState } from "@/app/actions/partners";

const inputClass =
  "rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-violet-500";

export function RedeemInviteForm() {
  const [state, action, pending] = useActionState<InviteState, FormData>(
    redeemInvite,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-medium">Einladungs-Code</span>
          <input
            type="text"
            name="code"
            placeholder="ABCD-EFGH-JKMN"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            required
            className={`${inputClass} font-mono tracking-wider`}
          />
        </label>
        <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
          {pending ? "Prüfen …" : "Annehmen"}
        </button>
      </div>

      {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}
      <p className="text-xs text-black/50 dark:text-white/50">
        Den Code bekommst du von der Person, deren Zyklus du begleiten sollst.
        Groß-/Kleinschreibung und Bindestriche sind egal.
      </p>
    </form>
  );
}
