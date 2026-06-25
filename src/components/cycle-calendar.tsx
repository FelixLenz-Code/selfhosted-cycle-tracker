import { classifyDay, todayISO, type DayKind, type CycleStats, type PeriodEntryLite } from "@/lib/cycle";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const KIND_CLASS: Record<Exclude<DayKind, "none">, string> = {
  period: "bg-rose-600 text-white",
  "predicted-period": "border border-dashed border-rose-500 text-rose-700 dark:text-rose-300",
  fertile: "bg-green-500/20 text-green-800 dark:text-green-200",
  ovulation: "bg-green-600 text-white",
};

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function CycleCalendar({
  monthStart,
  entries,
  stats,
}: {
  monthStart: string; // "YYYY-MM-01"
  entries: PeriodEntryLite[];
  stats: CycleStats;
}) {
  const [year, month] = monthStart.split("-").map(Number); // month: 1-12
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekdayUTC = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0=So
  const leadingBlanks = (firstWeekdayUTC + 6) % 7; // auf Montag-Start umrechnen
  const today = todayISO();

  const cells: ({ iso: string; day: number } | null)[] = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ iso: `${year}-${pad(month)}-${pad(d)}`, day: d });
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-black/50 dark:text-white/50">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell) return <div key={`b${i}`} />;
          const kind = classifyDay(cell.iso, entries, stats);
          const kindClass = kind === "none" ? "" : KIND_CLASS[kind];
          const isToday = cell.iso === today;
          return (
            <div
              key={cell.iso}
              className={`flex aspect-square items-center justify-center rounded-md text-sm ${kindClass} ${
                isToday ? "ring-2 ring-offset-1 ring-black/40 dark:ring-white/60" : ""
              }`}
            >
              {cell.day}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-black/60 dark:text-white/60">
        <Legend className="bg-rose-600" label="Blutung" />
        <Legend className="border border-dashed border-rose-500" label="Vorhergesagte Periode" />
        <Legend className="bg-green-500/40" label="Fruchtbares Fenster" />
        <Legend className="bg-green-600" label="Eisprung (Schätzung)" />
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-3 w-3 rounded ${className}`} />
      {label}
    </span>
  );
}
