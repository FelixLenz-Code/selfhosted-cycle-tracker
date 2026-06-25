import { formatGermanDate } from "@/lib/format";
import type { CycleStats } from "@/lib/cycle";

function Card({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        accent
          ? "border-violet-500/40 bg-violet-500/5"
          : "border-black/10 dark:border-white/15"
      }`}
    >
      <div className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-black/50 dark:text-white/50">{hint}</div>}
    </div>
  );
}

export function CycleOverview({ stats }: { stats: CycleStats }) {
  if (!stats.lastPeriodStart) {
    return (
      <div className="rounded-xl border border-black/10 dark:border-white/15 p-4 text-sm text-black/60 dark:text-white/60">
        Sobald du deine erste Blutung einträgst, erscheinen hier Zyklustag und
        Vorhersagen.
      </div>
    );
  }

  const sourceHint =
    stats.cycleLengthSource === "calculated"
      ? `Ø aus ${stats.recentCycleLengths.length} Zyklus${
          stats.recentCycleLengths.length === 1 ? "" : "len"
        }`
      : stats.cycleLengthSource === "override"
        ? "manuell festgelegt"
        : "Standardwert (28)";

  const nextHint =
    stats.daysUntilNextPeriod === null
      ? undefined
      : stats.daysUntilNextPeriod >= 0
        ? `in ${stats.daysUntilNextPeriod} Tagen`
        : `überfällig (${Math.abs(stats.daysUntilNextPeriod)} Tage)`;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Card
        label="Aktueller Zyklustag"
        value={stats.currentCycleDay !== null ? `Tag ${stats.currentCycleDay}` : "–"}
        hint={stats.isBleedingToday ? "Blutung läuft" : undefined}
        accent
      />
      <Card
        label="Ø Zykluslänge"
        value={`${stats.avgCycleLength} Tage`}
        hint={sourceHint}
      />
      <Card
        label="Nächste Periode"
        value={stats.predictedNextPeriod ? formatGermanDate(stats.predictedNextPeriod) : "–"}
        hint={nextHint}
      />
      <Card
        label="Fruchtbares Fenster"
        value={
          stats.fertileWindow
            ? `${formatGermanDate(stats.fertileWindow.start)} – ${formatGermanDate(
                stats.fertileWindow.end,
              )}`
            : "–"
        }
        hint={
          stats.estimatedOvulation
            ? `Eisprung ~ ${formatGermanDate(stats.estimatedOvulation)}`
            : undefined
        }
      />
    </div>
  );
}
