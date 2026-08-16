import { endPeriod, deletePeriod } from "@/app/actions/periods";
import { ConfirmSubmit } from "./confirm-submit";
import { PeriodEdit } from "./period-edit";
import { formatGermanDateWithWeekday } from "@/lib/format";
import { diffDays } from "@/lib/cycle";
import type { PeriodEntryLite } from "@/lib/cycle";

export function PeriodList({
  entries,
  today,
  ownerId,
  canEdit,
}: {
  entries: PeriodEntryLite[];
  today: string;
  ownerId: string;
  canEdit: boolean;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-black/15 dark:border-white/20 p-6 text-center text-sm text-black/50 dark:text-white/50">
        Noch keine Einträge. Trage oben deine erste Blutung ein.
      </div>
    );
  }

  // Zykluslänge eines Eintrags = Abstand von diesem Blutungsbeginn bis zum
  // nächsten (Zyklustag 1 bis Zyklustag 1). Der jüngste Eintrag hat noch keinen
  // Nachfolger – dort läuft der Zyklus noch.
  const ascending = [...entries].sort((a, b) => diffDays(a.startDate, b.startDate));
  const cycleLengths = new Map<string, number>();
  for (let i = 0; i < ascending.length - 1; i++) {
    const len = diffDays(ascending[i + 1].startDate, ascending[i].startDate);
    if (len > 0) cycleLengths.set(ascending[i].id, len);
  }
  const newestId = ascending[ascending.length - 1]?.id;

  return (
    <ul className="surface-card overflow-hidden divide-y divide-black/5 dark:divide-white/10">
      {entries.map((e) => {
        const ongoing = e.endDate === null;
        const days = e.endDate !== null ? diffDays(e.endDate, e.startDate) + 1 : null;
        const cycleLength = cycleLengths.get(e.id) ?? null;
        // Laufender Zyklus: Tage seit Blutungsbeginn (Beginn = Tag 1).
        const runningDay =
          e.id === newestId && diffDays(today, e.startDate) >= 0
            ? diffDays(today, e.startDate) + 1
            : null;
        return (
          <li
            key={e.id}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
          >
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                ongoing ? "bg-rose-500 animate-pulse" : "bg-rose-400/70"
              }`}
              aria-hidden
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 text-sm">
                <span className="font-medium">{formatGermanDateWithWeekday(e.startDate)}</span>
                {e.endDate && (
                  <>
                    <span className="text-black/30 dark:text-white/30">→</span>
                    <span className="font-medium">{formatGermanDateWithWeekday(e.endDate)}</span>
                  </>
                )}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-black/50 dark:text-white/50">
                {ongoing ? (
                  <span className="inline-flex items-center rounded-full bg-rose-500/15 px-2 py-0.5 font-medium text-rose-700 dark:text-rose-300">
                    läuft noch
                  </span>
                ) : (
                  <span>
                    {days} {days === 1 ? "Tag" : "Tage"} Blutung
                  </span>
                )}
                {cycleLength !== null ? (
                  <>
                    <span aria-hidden className="text-black/25 dark:text-white/25">
                      ·
                    </span>
                    <span>
                      Zyklus {cycleLength} {cycleLength === 1 ? "Tag" : "Tage"}
                    </span>
                  </>
                ) : (
                  runningDay !== null && (
                    <>
                      <span aria-hidden className="text-black/25 dark:text-white/25">
                        ·
                      </span>
                      <span>Zyklus läuft – Tag {runningDay}</span>
                    </>
                  )
                )}
              </div>
            </div>

            {canEdit && (
              <div className="flex shrink-0 items-center gap-1">
                {ongoing && (
                  <form action={endPeriod}>
                    <input type="hidden" name="id" value={e.id} />
                    <input type="hidden" name="ownerId" value={ownerId} />
                    <input type="hidden" name="endDate" value={today} />
                    <button
                      type="submit"
                      className="rounded-md border border-black/15 dark:border-white/20 px-2.5 py-1 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      Heute beenden
                    </button>
                  </form>
                )}
                <PeriodEdit
                  entry={{ id: e.id, startDate: e.startDate, endDate: e.endDate }}
                  ownerId={ownerId}
                  today={today}
                />
                <ConfirmSubmit
                  action={deletePeriod}
                  hidden={{ id: e.id, ownerId }}
                  label="✕"
                  confirmLabel="Wirklich löschen?"
                  idleAriaLabel="Eintrag löschen"
                  idleClassName="rounded-md px-2 py-1 text-xs text-black/40 hover:bg-red-500/10 hover:text-red-600 dark:text-white/40"
                  confirmClassName="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
