"use client";

import { useActionState, useState } from "react";
import {
  saveCycleSettings,
  type CycleSettingsState,
} from "@/app/actions/cycle-settings";
import type { CycleSettingsForm as Settings } from "@/lib/queries";

const inputClass =
  "rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-pink-500";

export function CycleSettingsForm({ settings }: { settings: Settings }) {
  const [state, action, pending] = useActionState<CycleSettingsState, FormData>(
    saveCycleSettings,
    undefined,
  );
  const [mode, setMode] = useState(settings.mode);

  return (
    <form action={action} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2 text-sm">
        <span className="font-medium">Ziel</span>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="mode"
            value="ttc"
            checked={mode === "ttc"}
            onChange={() => setMode("ttc")}
          />
          Kinderwunsch – Hinweis zur günstigen (fruchtbaren) Zeit
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="mode"
            value="avoid"
            checked={mode === "avoid"}
            onChange={() => setMode("avoid")}
          />
          Vermeidung – Hinweis zur vermeintlich unfruchtbaren Zeit
        </label>
      </fieldset>

      {mode === "avoid" && (
        <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
          <strong>Wichtig:</strong> Dies ist <strong>kein sicheres Verhütungsmittel</strong>.
          Der Eisprung schwankt; eine kalender-/berechnungsbasierte Methode kann eine
          Schwangerschaft nicht zuverlässig verhindern. Nutze die Hinweise nur als
          Orientierung.
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Fenster-Start</span>
          <input
            type="number"
            name="windowStartOffset"
            defaultValue={settings.windowStartOffset}
            min={-20}
            max={20}
            className={`${inputClass} w-28`}
          />
          <span className="text-xs text-black/50 dark:text-white/50">
            Tage zum Eisprung (negativ = davor)
          </span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Fenster-Ende</span>
          <input
            type="number"
            name="windowEndOffset"
            defaultValue={settings.windowEndOffset}
            min={-20}
            max={20}
            className={`${inputClass} w-28`}
          />
          <span className="text-xs text-black/50 dark:text-white/50">
            Tage zum Eisprung (positiv = danach)
          </span>
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Benachrichtigung um</span>
          <input
            type="time"
            name="notifyTime"
            defaultValue={settings.notifyTime}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Empfänger</span>
          <select
            name="notifyAudience"
            defaultValue={settings.notifyAudience}
            className={inputClass}
          >
            <option value="owner">Nur ich</option>
            <option value="partner">Nur Partner</option>
            <option value="both">Beide</option>
          </select>
        </label>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer font-medium">Erweitert</summary>
        <div className="mt-3 flex flex-wrap gap-3">
          <label className="flex flex-col gap-1">
            <span className="font-medium">Lutealphase (Tage)</span>
            <input
              type="number"
              name="lutealPhaseDays"
              defaultValue={settings.lutealPhaseDays}
              min={8}
              max={20}
              className={`${inputClass} w-28`}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-medium">Ø Zykluslänge fix</span>
            <input
              type="number"
              name="avgCycleLengthOverride"
              defaultValue={settings.avgCycleLengthOverride ?? ""}
              placeholder="auto"
              min={20}
              max={45}
              className={`${inputClass} w-28`}
            />
            <span className="text-xs text-black/50 dark:text-white/50">
              leer = automatisch berechnen
            </span>
          </label>
        </div>
      </details>

      {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700 disabled:opacity-60"
        >
          {pending ? "Speichern …" : "Einstellungen speichern"}
        </button>
      </div>
    </form>
  );
}
