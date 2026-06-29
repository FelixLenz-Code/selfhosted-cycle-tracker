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
      className={`surface-card relative overflow-hidden p-4 ${
        accent
          ? "ring-1 ring-violet-500/30"
          : ""
      }`}
    >
      {accent && (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 blur-xl"
        />
      )}
      <div className="text-xs font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-bold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-black/50 dark:text-white/50">{hint}</div>}
    </div>
  );
}

export function CycleOverview({ stats }: { stats: CycleStats }) {
  if (!stats.lastPeriodStart) {
    return (
      <div className="surface-card p-4 text-sm text-black/60 dark:text-white/60">
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
        label="Fruchtbare Zeit"
        value={
          stats.fertileWindow
            ? `${formatGermanDate(stats.fertileWindow.start)} – ${formatGermanDate(
                stats.fertileWindow.end,
              )}`
            : "–"
        }
      />
    </div>
  );
}
