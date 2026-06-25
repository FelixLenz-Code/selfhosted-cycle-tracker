"use client";

import { useState } from "react";
import {
  deleteMedication,
  toggleMedication,
} from "@/app/actions/medications";
import { MedicationForm } from "./medication-form";
import type { Medication } from "@/lib/medications-queries";

export function MedicationItem({ medication }: { medication: Medication }) {
  const [editing, setEditing] = useState(false);

  const WD = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const schedule =
    medication.scheduleType === "cycle_relative"
      ? `Zyklustag ${medication.cycleDayFrom ?? "?"}–${medication.cycleDayTo ?? "?"}`
      : medication.weekdays.length > 0
        ? medication.weekdays.map((d) => WD[d - 1]).join(", ")
        : "täglich";

  return (
    <li className="py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm">
          <span className="font-medium">{medication.name}</span>
          {medication.dosage && (
            <span className="text-black/60 dark:text-white/60"> · {medication.dosage}</span>
          )}
          <div className="text-xs text-black/50 dark:text-white/50">
            {medication.times.join(", ")} · {schedule}
            {!medication.active && " · pausiert"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing((v) => !v)}
            className="rounded-md border border-black/15 dark:border-white/20 px-2.5 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10"
          >
            {editing ? "Abbrechen" : "Bearbeiten"}
          </button>
          <form action={toggleMedication}>
            <input type="hidden" name="id" value={medication.id} />
            <input type="hidden" name="active" value={(!medication.active).toString()} />
            <button
              type="submit"
              className="rounded-md border border-black/15 dark:border-white/20 px-2.5 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10"
            >
              {medication.active ? "Pausieren" : "Aktivieren"}
            </button>
          </form>
          <form action={deleteMedication}>
            <input type="hidden" name="id" value={medication.id} />
            <button
              type="submit"
              className="rounded-md px-2.5 py-1 text-xs text-red-600 hover:bg-red-500/10"
            >
              Löschen
            </button>
          </form>
        </div>
      </div>

      {editing && (
        <div className="mt-3 rounded-lg border border-black/10 dark:border-white/15 p-4">
          <MedicationForm medication={medication} onDone={() => setEditing(false)} />
        </div>
      )}
    </li>
  );
}
