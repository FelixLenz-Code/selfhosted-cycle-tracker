"use client";

import { useActionState } from "react";
import { invitePartner, type InviteState } from "@/app/actions/partners";

const inputClass =
  "rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-pink-500";

export function InviteForm() {
  const [state, action, pending] = useActionState<InviteState, FormData>(
    invitePartner,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-medium">E-Mail des Partners</span>
          <input
            type="email"
            name="email"
            placeholder="partner@example.com"
            required
            className={inputClass}
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700 disabled:opacity-60"
        >
          {pending ? "Senden …" : "Einladen"}
        </button>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="canEdit" className="h-4 w-4" />
        <span>Darf auch Einträge bearbeiten (nicht nur ansehen)</span>
      </label>

      {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}
      <p className="text-xs text-black/50 dark:text-white/50">
        Die Person muss sich mit dieser E-Mail registrieren, um die Einladung anzunehmen.
      </p>
    </form>
  );
}
