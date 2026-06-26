import {
  classifyDay,
  isInGvWindow,
  todayISO,
  type DayKind,
  type CycleStats,
  type PeriodEntryLite,
} from "@/lib/cycle";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const KIND_CLASS: Record<Exclude<DayKind, "none">, string> = {
  period: "bg-rose-600 text-white",
  "predicted-period": "border border-dashed border-rose-500 text-rose-700 dark:text-rose-300",
  fertile: "bg-green-500/20 text-green-800 dark:text-green-200",
};

// Farbunabhängige Zweitkennzeichnung (Formen) – für Rot-Grün-Sehschwäche lesbar.
const KIND_SYMBOL: Record<Exclude<DayKind, "none">, string> = {
  period: "●",
  "predicted-period": "○",
  fertile: "▲",
};

const KIND_LABEL: Record<Exclude<DayKind, "none">, string> = {
  period: "Blutung",
  "predicted-period": "Vorhergesagte Periode",
  fertile: "Fruchtbare Zeit",
};

// Das Spaß-/GV-Fenster wird als ♥ überlagert (kann mit fruchtbar/Eisprung überlappen).
// Violett kontrastiert sowohl auf rotem als auch auf grünem Hintergrund.
const GV_SYMBOL = "♥";

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
  const gvLabel = "Spaß-Zeit";

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
          const symbol = kind === "none" ? null : KIND_SYMBOL[kind];
          const inGv = isInGvWindow(cell.iso, stats);
          // Spaß-/GV-Fenster zusätzlich als violetter Rahmen (inset, kein Layout-Shift).
          const gvClass = inGv
            ? "outline outline-2 outline-offset-[-2px] outline-violet-500 dark:outline-violet-400"
            : "";
          const isToday = cell.iso === today;
          const title = [kind === "none" ? null : KIND_LABEL[kind], inGv ? gvLabel : null]
            .filter(Boolean)
            .join(" · ");
          return (
            <div
              key={cell.iso}
              title={title || undefined}
              className={`relative flex aspect-square items-center justify-center rounded-md text-sm ${kindClass} ${gvClass} ${
                isToday ? "ring-2 ring-offset-1 ring-black/40 dark:ring-white/60" : ""
              }`}
            >
              {symbol && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-0.5 top-0.5 text-sm font-semibold leading-none"
                >
                  {symbol}
                </span>
              )}
              {inGv && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute right-0.5 bottom-0.5 text-sm leading-none text-violet-600 dark:text-violet-300"
                >
                  {GV_SYMBOL}
                </span>
              )}
              {cell.day}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-black/60 dark:text-white/60">
        <Legend className="bg-rose-600" symbol={KIND_SYMBOL.period} label="Blutung" />
        <Legend
          className="border border-dashed border-rose-500"
          symbol={KIND_SYMBOL["predicted-period"]}
          label="Vorhergesagte Periode"
        />
        <Legend className="bg-green-500/40" symbol={KIND_SYMBOL.fertile} label="Fruchtbare Zeit" />
        <Legend
          className="border-2 border-violet-500 dark:border-violet-400"
          symbol={GV_SYMBOL}
          symbolClass="text-violet-600 dark:text-violet-300"
          label={gvLabel}
        />
      </div>
    </div>
  );
}

function Legend({
  className,
  symbol,
  symbolClass,
  label,
}: {
  className: string;
  symbol: string;
  symbolClass?: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-3 w-3 rounded ${className}`} />
      <span className={`text-xs leading-none ${symbolClass ?? ""}`} aria-hidden>
        {symbol}
      </span>
      {label}
    </span>
  );
}
