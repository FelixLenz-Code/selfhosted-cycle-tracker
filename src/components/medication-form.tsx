"use client";

import { useActionState, useState } from "react";
import {
  addMedication,
  updateMedication,
  type MedFormState,
} from "@/app/actions/medications";
import type { Medication } from "@/lib/medications-queries";

const inputClass =
  "rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-violet-500";

const WEEKDAYS = [
  { n: 1, label: "Mo" },
  { n: 2, label: "Di" },
  { n: 3, label: "Mi" },
  { n: 4, label: "Do" },
  { n: 5, label: "Fr" },
  { n: 6, label: "Sa" },
  { n: 7, label: "So" },
];

export function MedicationForm({
  medication,
  onDone,
}: {
  medication?: Medication;
  onDone?: () => void;
}) {
  const isEdit = Boolean(medication);
  const [state, action, pending] = useActionState<MedFormState, FormData>(
    isEdit ? updateMedication : addMedication,
    undefined,
  );
  const [scheduleType, setScheduleType] = useState<Medication["scheduleType"]>(
    medication?.scheduleType ?? "fixed_time",
  );

  return (
    <form
      action={async (fd) => {
        await action(fd);
        onDone?.();
      }}
      className="flex flex-col gap-3"
    >
      {isEdit && <input type="hidden" name="id" value={medication!.id} />}

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-medium">Name</span>
          <input name="name" defaultValue={medication?.name} required className={inputClass} />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-medium">Dosis (optional)</span>
          <input
            name="dosage"
            defaultValue={medication?.dosage ?? ""}
            placeholder="z. B. 1 Tablette"
            className={inputClass}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Uhrzeit(en)</span>
        <input
          name="times"
          defaultValue={medication?.times.join(", ")}
          placeholder="08:00, 20:00"
          required
          className={inputClass}
        />
        <span className="text-xs text-black/50 dark:text-white/50">
          Mehrere Zeiten mit Komma trennen (Format HH:MM).
        </span>
      </label>

      <fieldset className="flex flex-col gap-2 text-sm">
        <span className="font-medium">Zeitplan</span>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="scheduleType"
            value="fixed_time"
            checked={scheduleType === "fixed_time"}
            onChange={() => setScheduleType("fixed_time")}
          />
          Täglich zu festen Uhrzeiten
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="scheduleType"
            value="cycle_relative"
            checked={scheduleType === "cycle_relative"}
            onChange={() => setScheduleType("cycle_relative")}
          />
          Nur an bestimmten Zyklustagen
        </label>
      </fieldset>

      {scheduleType === "fixed_time" && (
        <div className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Wochentage</span>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map(({ n, label }) => (
              <label key={n} className="cursor-pointer">
                <input
                  type="checkbox"
                  name="weekdays"
                  value={n}
                  defaultChecked={medication?.weekdays.includes(n)}
                  className="peer sr-only"
                />
                <span className="inline-flex h-9 w-10 items-center justify-center rounded-md border border-black/15 dark:border-white/20 text-sm peer-checked:border-violet-600 peer-checked:bg-violet-600 peer-checked:text-white">
                  {label}
                </span>
              </label>
            ))}
          </div>
          <span className="text-xs text-black/50 dark:text-white/50">
            Keine Auswahl = täglich.
          </span>
        </div>
      )}

      {scheduleType === "cycle_relative" && (
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Zyklustag von</span>
            <input
              type="number"
              name="cycleDayFrom"
              min={1}
              max={60}
              defaultValue={medication?.cycleDayFrom ?? ""}
              className={`${inputClass} w-28`}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">bis</span>
            <input
              type="number"
              name="cycleDayTo"
              min={1}
              max={60}
              defaultValue={medication?.cycleDayTo ?? ""}
              className={`${inputClass} w-28`}
            />
          </label>
        </div>
      )}

      {state?.error && <p className="text-sm text-red-500">{state.error}</p>}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="btn-primary disabled:opacity-60"
        >
          {pending ? "Speichern …" : isEdit ? "Änderungen speichern" : "Medikament hinzufügen"}
        </button>
      </div>
    </form>
  );
}
