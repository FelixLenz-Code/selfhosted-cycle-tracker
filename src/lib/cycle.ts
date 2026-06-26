// Reine Zyklus-Berechnungen (keine DB-/Server-Abhängigkeit, gut testbar).
// Datumswerte sind ISO-Date-Strings "YYYY-MM-DD" und werden in UTC behandelt,
// um Zeitzonen-Verschiebungen bei reinen Kalenderdaten zu vermeiden.

export type PeriodEntryLite = {
  id: string;
  startDate: string; // "YYYY-MM-DD"
  endDate: string | null;
};

export type CycleMode = "ttc" | "avoid";

export type CycleSettingsLite = {
  avgCycleLengthOverride: number | null;
  mode: CycleMode;
  // Fruchtbares Fenster (Kinderwunsch), Zyklustage ab Blutungstag 1 (manuell).
  fertileStartDay: number;
  fertileEndDay: number;
  // Spaß-Zeit-Fenster, Zyklustage ab Blutungstag 1. windowEndDay = null -> bis zur nächsten Blutung.
  windowStartDay: number;
  windowEndDay: number | null;
};

export type CycleStats = {
  avgCycleLength: number;
  cycleLengthSource: "override" | "calculated" | "default";
  recentCycleLengths: number[];
  lastPeriodStart: string | null;
  isBleedingToday: boolean;
  ongoingEntryId: string | null;
  currentCycleDay: number | null;
  predictedNextPeriod: string | null;
  daysUntilNextPeriod: number | null;
  fertileWindow: { start: string; end: string } | null;
  // Konfiguriertes GV-Fenster (relativ zum Eisprung, modusabhängige Offsets)
  mode: CycleMode;
  gvWindow: { start: string; end: string } | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_CYCLE_LENGTH = 28;

export function parseDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function todayISO(now: Date = new Date()): string {
  return formatDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())));
}

export function addDays(iso: string, days: number): string {
  return formatDate(new Date(parseDate(iso).getTime() + days * DAY_MS));
}

export function diffDays(aIso: string, bIso: string): number {
  // a - b in ganzen Tagen
  return Math.round((parseDate(aIso).getTime() - parseDate(bIso).getTime()) / DAY_MS);
}

function isWithin(iso: string, start: string, end: string): boolean {
  return diffDays(iso, start) >= 0 && diffDays(end, iso) >= 0;
}

export function computeCycleStats(
  entries: PeriodEntryLite[],
  settings: CycleSettingsLite,
  today: string = todayISO(),
): CycleStats {
  const sorted = [...entries].sort((a, b) => diffDays(a.startDate, b.startDate));

  // Zykluslängen aus aufeinanderfolgenden Perioden-Starts
  const cycleLengths: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const len = diffDays(sorted[i].startDate, sorted[i - 1].startDate);
    if (len > 0) cycleLengths.push(len);
  }
  const recentCycleLengths = cycleLengths.slice(-6);

  let avgCycleLength: number;
  let cycleLengthSource: CycleStats["cycleLengthSource"];
  if (settings.avgCycleLengthOverride && settings.avgCycleLengthOverride > 0) {
    avgCycleLength = settings.avgCycleLengthOverride;
    cycleLengthSource = "override";
  } else if (recentCycleLengths.length > 0) {
    const sum = recentCycleLengths.reduce((a, b) => a + b, 0);
    avgCycleLength = Math.round(sum / recentCycleLengths.length);
    cycleLengthSource = "calculated";
  } else {
    avgCycleLength = DEFAULT_CYCLE_LENGTH;
    cycleLengthSource = "default";
  }

  const lastEntry = sorted[sorted.length - 1] ?? null;
  const lastPeriodStart = lastEntry?.startDate ?? null;

  // Läuft heute eine Blutung? (Eintrag ohne Ende, dessen Start <= heute,
  // oder ein Eintrag, dessen Bereich heute einschließt)
  let isBleedingToday = false;
  let ongoingEntryId: string | null = null;
  for (const e of sorted) {
    if (e.endDate === null) {
      if (diffDays(today, e.startDate) >= 0) {
        isBleedingToday = true;
        ongoingEntryId = e.id;
      }
    } else if (isWithin(today, e.startDate, e.endDate)) {
      isBleedingToday = true;
    }
  }

  const currentCycleDay = lastPeriodStart ? diffDays(today, lastPeriodStart) + 1 : null;

  let predictedNextPeriod: string | null = null;
  let daysUntilNextPeriod: number | null = null;
  let fertileWindow: { start: string; end: string } | null = null;
  let gvWindow: { start: string; end: string } | null = null;

  if (lastPeriodStart) {
    predictedNextPeriod = addDays(lastPeriodStart, avgCycleLength);
    daysUntilNextPeriod = diffDays(predictedNextPeriod, today);
    // Beide Fenster sind manuell, relativ zum Blutungsbeginn (Zyklustag 1 = lastPeriodStart).
    fertileWindow = {
      start: addDays(lastPeriodStart, settings.fertileStartDay - 1),
      end: addDays(lastPeriodStart, settings.fertileEndDay - 1),
    };
    // Spaß-Fenster; Ende offen -> bis zum Tag vor der nächsten Blutung.
    gvWindow = {
      start: addDays(lastPeriodStart, settings.windowStartDay - 1),
      end:
        settings.windowEndDay !== null
          ? addDays(lastPeriodStart, settings.windowEndDay - 1)
          : addDays(predictedNextPeriod, -1),
    };
  }

  return {
    avgCycleLength,
    cycleLengthSource,
    recentCycleLengths,
    lastPeriodStart,
    isBleedingToday,
    ongoingEntryId,
    currentCycleDay,
    predictedNextPeriod,
    daysUntilNextPeriod,
    fertileWindow,
    mode: settings.mode,
    gvWindow,
  };
}

// Liegt ein Tag im konfigurierten GV-/Spaß-Fenster? (überlagert die Tagesklasse,
// da es sich z. B. mit dem fruchtbaren Fenster überschneiden kann.)
export function isInGvWindow(iso: string, stats: CycleStats): boolean {
  return Boolean(stats.gvWindow && isWithin(iso, stats.gvWindow.start, stats.gvWindow.end));
}

// Klassifizierung eines Tages für die Kalenderansicht
export type DayKind = "period" | "predicted-period" | "fertile" | "none";

export function classifyDay(
  iso: string,
  entries: PeriodEntryLite[],
  stats: CycleStats,
): DayKind {
  // Tatsächliche Blutungstage (höchste Priorität)
  for (const e of entries) {
    const end = e.endDate ?? e.startDate;
    if (isWithin(iso, e.startDate, end)) return "period";
  }
  if (stats.fertileWindow && isWithin(iso, stats.fertileWindow.start, stats.fertileWindow.end)) {
    return "fertile";
  }
  // Vorhergesagte Periode: avgCycleLength Tage ab Vorhersagestart als grober Block
  if (stats.predictedNextPeriod) {
    const predEnd = addDays(stats.predictedNextPeriod, 4);
    if (isWithin(iso, stats.predictedNextPeriod, predEnd)) return "predicted-period";
  }
  return "none";
}
