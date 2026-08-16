"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  classifyDay,
  cycleDayOn,
  isInGvWindow,
  type DayKind,
  type CycleStats,
  type PeriodEntryLite,
} from "@/lib/cycle";
import { formatGermanDateWithWeekday } from "@/lib/format";
import { medicationsDueOn, type Medication } from "@/lib/medications";
import { SEX_TYPES, entrySexTypes, sexTypeMeta, type SexEntry } from "@/lib/sex";
import { ParticipantChips } from "./sex-participants";

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

const KIND_BADGE: Record<Exclude<DayKind, "none">, string> = {
  period: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "predicted-period": "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  fertile: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

// Das Spaß-/GV-Fenster wird als ♥ überlagert (kann mit fruchtbar/Eisprung überlappen).
// Violett kontrastiert sowohl auf rotem als auch auf grünem Hintergrund.
const GV_SYMBOL = "♥";
const GV_LABEL = "Spaß-Zeit";

const dialogClass =
  "m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-black/10 bg-white p-0 text-black shadow-xl backdrop:bg-black/50 dark:border-white/15 dark:bg-neutral-900 dark:text-white";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function CycleCalendar({
  monthStart,
  entries,
  stats,
  today,
  sexEntries = [],
  medications = [],
  sexHref = "/sex",
  medicationsHref = "/medications",
}: {
  monthStart: string; // "YYYY-MM-01"
  entries: PeriodEntryLite[];
  stats: CycleStats;
  today: string; // vom Server, damit Client und Server denselben Tag markieren
  sexEntries?: SexEntry[]; // Einträge des angezeigten Monats
  medications?: Medication[];
  sexHref?: string;
  medicationsHref?: string;
}) {
  // Sex-Einträge je Tag: unten im Feld ein Punkt pro Eintrag.
  const sexByDay = new Map<string, SexEntry[]>();
  for (const e of sexEntries) {
    const list = sexByDay.get(e.occurredOn);
    if (list) list.push(e);
    else sexByDay.set(e.occurredOn, [e]);
  }

  const [selected, setSelected] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (selected && !d.open) d.showModal();
    if (!selected && d.open) d.close();
  }, [selected]);

  const [year, month] = monthStart.split("-").map(Number); // month: 1-12
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekdayUTC = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0=So
  const leadingBlanks = (firstWeekdayUTC + 6) % 7; // auf Montag-Start umrechnen

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
          const dots = sexOfDay.flatMap(entrySexTypes);
          const baseClass =
            kind === "none"
              ? "bg-black/[0.02] dark:bg-white/[0.04] hover:bg-black/[0.05] dark:hover:bg-white/[0.07]"
              : "";
          const title = [
            kind === "none" ? null : KIND_LABEL[kind],
            inGv ? GV_LABEL : null,
            ...sexOfDay.map(
              (e) =>
                `${e.occurredTime} ${entrySexTypes(e).map((t) => sexTypeMeta(t).label).join("/")}`,
            ),
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => setSelected(cell.iso)}
              title={title || undefined}
              aria-label={`${formatGermanDateWithWeekday(cell.iso)} – Ereignisse anzeigen`}
              className={`relative flex aspect-square cursor-pointer items-center justify-center rounded-xl text-base font-medium transition-colors focus-visible:ring-2 focus-visible:ring-violet-500 ${baseClass} ${kindClass} ${gvClass} ${
                isToday
                  ? "ring-2 ring-offset-2 ring-offset-[var(--surface)] ring-violet-500 dark:ring-violet-400"
                  : ""
              }`}
            >
              {(symbol || inGv) && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0.5 flex items-center justify-center gap-0.5 text-base leading-none drop-shadow-sm sm:text-lg"
                >
                  {inGv && (
                    <span className="text-violet-600 dark:text-violet-300">{GV_SYMBOL}</span>
                  )}
                  {symbol && <span className="font-bold">{symbol}</span>}
                </span>
              )}
              <span className="mt-2 leading-none sm:mt-2.5">{cell.day}</span>
              {dots.length > 0 && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-1 flex items-center justify-center gap-0.5"
                >
                  {dots.slice(0, 3).map((t, di) => (
                    <span
                      key={di}
                      className={`h-1.5 w-1.5 rounded-full ring-1 ring-white/70 dark:ring-black/40 ${
                        sexTypeMeta(t).dotClass
                      }`}
                    />
                  ))}
                </span>
              )}
            </button>
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
          label={GV_LABEL}
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

      <p className="mt-3 text-xs text-black/45 dark:text-white/45">
        Tipp: Auf einen Tag tippen zeigt alle Ereignisse dieses Tages.
      </p>

      <dialog
        ref={dialogRef}
        className={dialogClass}
        aria-label="Ereignisse des Tages"
        onClose={() => setSelected(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setSelected(null);
        }}
      >
        {selected && (
          <DayDetails
            iso={selected}
            entries={entries}
            stats={stats}
            today={today}
            sexOfDay={sexByDay.get(selected) ?? []}
            medications={medications}
            sexHref={sexHref}
            medicationsHref={medicationsHref}
            onClose={() => setSelected(null)}
          />
        )}
      </dialog>
    </div>
  );
}

function DayDetails({
  iso,
  entries,
  stats,
  today,
  sexOfDay,
  medications,
  sexHref,
  medicationsHref,
  onClose,
}: {
  iso: string;
  entries: PeriodEntryLite[];
  stats: CycleStats;
  today: string;
  sexOfDay: SexEntry[];
  medications: Medication[];
  sexHref: string;
  medicationsHref: string;
  onClose: () => void;
}) {
  const kind = classifyDay(iso, entries, stats);
  const inGv = isInGvWindow(iso, stats);
  const cycleDay = cycleDayOn(iso, entries);
  const meds = medicationsDueOn(iso, medications, cycleDay);

  return (
    <div className="flex max-h-[85vh] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-black/10 px-5 py-3 dark:border-white/10">
        <h2 className="text-base font-semibold">
          {formatGermanDateWithWeekday(iso)}
          {iso === today && (
            <span className="ml-2 rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300">
              Heute
            </span>
          )}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="grid h-8 w-8 place-items-center rounded-full text-lg leading-none text-black/50 hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/10"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-col gap-5 overflow-y-auto px-5 py-4 text-sm">
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-black/45 dark:text-white/45">
            Zyklus
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {kind !== "none" && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${KIND_BADGE[kind]}`}
              >
                <span aria-hidden>{KIND_SYMBOL[kind]}</span>
                {KIND_LABEL[kind]}
              </span>
            )}
            {inGv && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300">
                <span aria-hidden>{GV_SYMBOL}</span>
                {GV_LABEL}
              </span>
            )}
            {kind === "none" && !inGv && (
              <span className="text-black/55 dark:text-white/55">
                Keine Zyklus-Markierung an diesem Tag.
              </span>
            )}
          </div>
          {cycleDay !== null && cycleDay >= 1 && (
            <p className="mt-2 text-black/55 dark:text-white/55">
              Zyklustag {cycleDay}
            </p>
          )}
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-black/45 dark:text-white/45">
            Sex
          </h3>
          {sexOfDay.length === 0 ? (
            <p className="mt-2 text-black/55 dark:text-white/55">Keine Einträge.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {sexOfDay.map((e) => (
                <li key={e.id} className="flex items-start gap-3">
                  <span className="w-12 shrink-0 pt-0.5 text-sm font-medium tabular-nums">
                    {e.occurredTime}
                  </span>
                  <ParticipantChips participants={e.participants} />
                </li>
              ))}
            </ul>
          )}
          <Link
            href={sexHref}
            className="mt-2 inline-block text-xs font-medium text-violet-700 hover:underline dark:text-violet-300"
          >
            Zu „Sex“ →
          </Link>
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-black/45 dark:text-white/45">
            Medikamente
          </h3>
          {meds.length === 0 ? (
            <p className="mt-2 text-black/55 dark:text-white/55">
              Nichts fällig an diesem Tag.
            </p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1">
              {meds.map((m, i) => (
                <li key={`${m.id}-${i}`} className="flex items-start gap-3">
                  <span className="w-12 shrink-0 text-sm font-medium tabular-nums">
                    {m.time}
                  </span>
                  <span>
                    {m.name}
                    {m.dosage && (
                      <span className="text-black/55 dark:text-white/55"> · {m.dosage}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link
            href={medicationsHref}
            className="mt-2 inline-block text-xs font-medium text-violet-700 hover:underline dark:text-violet-300"
          >
            Zu „Medikamente“ →
          </Link>
        </section>
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
