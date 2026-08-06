import {
  classifyDay,
  isInGvWindow,
  todayISO,
  type DayKind,
  type CycleStats,
  type PeriodEntryLite,
} from "@/lib/cycle";
import { SEX_TYPES, sexTypeMeta, type SexEntry } from "@/lib/sex";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const KIND_CLASS: Record<Exclude<DayKind, "none">, string> = {
  period: "bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-sm shadow-rose-500/30",
  "predicted-period":
    "border-2 border-dashed border-rose-400 text-rose-700 dark:text-rose-300 bg-rose-500/5",
  fertile:
    "bg-gradient-to-br from-emerald-400/25 to-green-500/20 text-green-800 dark:text-green-200",
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
  sexEntries = [],
}: {
  monthStart: string; // "YYYY-MM-01"
  entries: PeriodEntryLite[];
  stats: CycleStats;
  sexEntries?: SexEntry[]; // Einträge des angezeigten Monats
}) {
  // Sex-Einträge je Tag: unten im Feld ein Punkt pro Eintrag.
  const sexByDay = new Map<string, SexEntry[]>();
  for (const e of sexEntries) {
    const list = sexByDay.get(e.occurredOn);
    if (list) list.push(e);
    else sexByDay.set(e.occurredOn, [e]);
  }
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
      <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1 sm:gap-1.5">
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
          const sexOfDay = sexByDay.get(cell.iso) ?? [];
          const baseClass =
            kind === "none"
              ? "bg-black/[0.02] dark:bg-white/[0.04] hover:bg-black/[0.05] dark:hover:bg-white/[0.07]"
              : "";
          const title = [
            kind === "none" ? null : KIND_LABEL[kind],
            inGv ? gvLabel : null,
            ...sexOfDay.map((e) => `${e.occurredTime} ${sexTypeMeta(e.type).label}`),
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <div
              key={cell.iso}
              title={title || undefined}
              className={`relative flex aspect-square items-center justify-center rounded-xl text-base font-medium transition-colors ${baseClass} ${kindClass} ${gvClass} ${
                isToday ? "ring-2 ring-offset-2 ring-offset-[var(--surface)] ring-violet-500 dark:ring-violet-400" : ""
              }`}
            >
              {(symbol || inGv) && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0.5 flex items-center justify-center gap-0.5 text-base leading-none drop-shadow-sm sm:text-lg"
                >
                  {inGv && <span className="text-violet-600 dark:text-violet-300">{GV_SYMBOL}</span>}
                  {symbol && <span className="font-bold">{symbol}</span>}
                </span>
              )}
              <span className="mt-2 leading-none sm:mt-2.5">{cell.day}</span>
              {sexOfDay.length > 0 && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-1 flex items-center justify-center gap-0.5"
                >
                  {sexOfDay.slice(0, 3).map((e) => (
                    <span
                      key={e.id}
                      className={`h-1.5 w-1.5 rounded-full ring-1 ring-white/70 dark:ring-black/40 ${
                        sexTypeMeta(e.type).dotClass
                      }`}
                    />
                  ))}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-black/60 dark:text-white/60">
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
        {sexEntries.length > 0 && (
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-black/5 bg-black/[0.03] px-2.5 py-1 dark:border-white/10 dark:bg-white/[0.05]">
            <span className="text-black/45 dark:text-white/45">Sex:</span>
            {SEX_TYPES.map((t) => (
              <span key={t.value} className="inline-flex items-center gap-1">
                <span className={`h-1.5 w-1.5 rounded-full ${t.dotClass}`} aria-hidden />
                {t.label}
              </span>
            ))}
          </span>
        )}
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
    <span className="inline-flex items-center gap-1.5 rounded-full border border-black/5 bg-black/[0.03] px-2.5 py-1 dark:border-white/10 dark:bg-white/[0.05]">
      <span className={`inline-block h-3.5 w-3.5 rounded-md ${className}`} />
      <span className={`text-base leading-none ${symbolClass ?? ""}`} aria-hidden>
        {symbol}
      </span>
      {label}
    </span>
  );
}
