// Medikamenten-Typ und die reine Fälligkeits-Rechnung (keine DB-Abhängigkeit),
// damit Kalender-Popup (Client) und Server dieselbe Logik nutzen.
// Die Regeln entsprechen denen des Workers (worker/index.mjs).

export type Medication = {
  id: string;
  name: string;
  dosage: string | null;
  active: boolean;
  scheduleType: "fixed_time" | "cycle_relative";
  times: string[];
  weekdays: number[]; // ISO 1=Mo..7=So; leer = täglich
  cycleDayFrom: number | null;
  cycleDayTo: number | null;
};

export type MedicationDue = {
  id: string;
  name: string;
  dosage: string | null;
  time: string; // "HH:MM"
};

// ISO-Wochentag eines Kalendertages: 1=Mo .. 7=So
function isoWeekday(iso: string): number {
  return ((new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;
}

// Alle Einnahmezeitpunkte eines Tages, aufsteigend nach Uhrzeit.
// `cycleDay` ist der Zyklustag dieses Tages (null = kein Blutungsbeginn bekannt).
export function medicationsDueOn(
  iso: string,
  meds: Medication[],
  cycleDay: number | null,
): MedicationDue[] {
  const weekday = isoWeekday(iso);
  const out: MedicationDue[] = [];

  for (const m of meds) {
    if (!m.active) continue;

    if (m.scheduleType === "fixed_time") {
      if (m.weekdays.length > 0 && !m.weekdays.includes(weekday)) continue;
    } else {
      if (cycleDay === null) continue;
      if (m.cycleDayFrom !== null && cycleDay < m.cycleDayFrom) continue;
      if (m.cycleDayTo !== null && cycleDay > m.cycleDayTo) continue;
    }

    for (const t of m.times) {
      out.push({ id: m.id, name: m.name, dosage: m.dosage, time: t.slice(0, 5) });
    }
  }

  return out.sort((a, b) => a.time.localeCompare(b.time));
}
