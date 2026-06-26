"use client";

import { useActionState, useState } from "react";
import {
  saveCycleSettings,
  type CycleSettingsState,
} from "@/app/actions/cycle-settings";
import type { CycleSettingsForm as Settings } from "@/lib/queries";

const inputClass =
  "rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-violet-500";

export function CycleSettingsForm({ settings }: { settings: Settings }) {
  const [state, action, pending] = useActionState<CycleSettingsState, FormData>(
    saveCycleSettings,
    undefined,
  );
  const [mode, setMode] = useState(settings.mode);
  const [untilBleeding, setUntilBleeding] = useState(settings.windowEndDay === null);

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="rounded-md bg-black/5 dark:bg-white/10 p-3 text-xs text-black/60 dark:text-white/60">
        Zyklustag&nbsp;1 = erster Tag der Blutung. Beide Fenster werden immer im
        Kalender angezeigt. Der Fokus unten steuert nur, worüber du benachrichtigt
        wirst.
      </div>

      {/* Fruchtbare Zeit (Kinderwunsch) */}
      <fieldset className="flex flex-col gap-3 rounded-xl border border-green-600/40 p-4">
        <legend className="px-1 text-sm font-medium text-green-700 dark:text-green-300">
          Fruchtbare Zeit (Kinderwunsch)
        </legend>
        <p className="text-xs text-black/60 dark:text-white/60">
          Im Kalender grün markiert. Typisch etwa Zyklustag&nbsp;12–16.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">von Zyklustag</span>
            <input
              type="number"
              name="fertileStartDay"
              defaultValue={settings.fertileStartDay}
              min={1}
              max={60}
              className={`${inputClass} w-28`}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">bis Zyklustag</span>
            <input
              type="number"
              name="fertileEndDay"
              defaultValue={settings.fertileEndDay}
              min={1}
              max={60}
              className={`${inputClass} w-28`}
            />
          </label>
        </div>
      </fieldset>

      {/* Spaß-Zeit */}
      <fieldset className="flex flex-col gap-3 rounded-xl border border-violet-500/40 p-4">
        <legend className="px-1 text-sm font-medium text-violet-700 dark:text-violet-300">
          Spaß-Zeit
        </legend>
        <p className="text-xs text-black/60 dark:text-white/60">
          Im Kalender mit ♥ und violettem Rahmen. Typisch z.&nbsp;B. ab Tag&nbsp;28
          bis zur nächsten Blutung.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">von Zyklustag</span>
            <input
              type="number"
              name="windowStartDay"
              defaultValue={settings.windowStartDay}
              min={1}
              max={60}
              className={`${inputClass} w-28`}
            />
          </label>
          {!untilBleeding && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">bis Zyklustag</span>
              <input
                type="number"
                name="windowEndDay"
                defaultValue={settings.windowEndDay ?? 15}
                min={1}
                max={60}
                className={`${inputClass} w-28`}
              />
            </label>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="untilBleeding"
            checked={untilBleeding}
            onChange={(e) => setUntilBleeding(e.target.checked)}
            className="h-4 w-4"
          />
          bis zur nächsten Blutung
        </label>
        <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
          Hinweis: Das ist <strong>keine sichere Verhütung</strong> – der Eisprung
          schwankt. Nur als Orientierung verstehen.
        </div>
      </fieldset>

      {/* Fokus / Benachrichtigung */}
      <fieldset className="flex flex-col gap-2 text-sm">
        <span className="font-medium">Fokus für Benachrichtigungen</span>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="mode"
            value="ttc"
            checked={mode === "ttc"}
            onChange={() => setMode("ttc")}
          />
          Kinderwunsch – Hinweis zum Start der fruchtbaren Zeit
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="mode"
            value="avoid"
            checked={mode === "avoid"}
            onChange={() => setMode("avoid")}
          />
          Spaß-Zeit – Hinweis zum Start der Spaß-Zeit
        </label>
      </fieldset>

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
          className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {pending ? "Speichern …" : "Einstellungen speichern"}
        </button>
      </div>
    </form>
  );
}
