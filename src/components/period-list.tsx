import { endPeriod, deletePeriod } from "@/app/actions/periods";
import { formatGermanDate } from "@/lib/format";
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

  return (
    <ul className="overflow-hidden rounded-xl border border-black/10 dark:border-white/15 divide-y divide-black/5 dark:divide-white/10">
      {entries.map((e) => {
        const ongoing = e.endDate === null;
        const days = e.endDate !== null ? diffDays(e.endDate, e.startDate) + 1 : null;
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
                <span className="font-medium">{formatGermanDate(e.startDate)}</span>
                {e.endDate && (
                  <>
                    <span className="text-black/30 dark:text-white/30">→</span>
                    <span className="font-medium">{formatGermanDate(e.endDate)}</span>
                  </>
                )}
              </div>
              <div className="mt-0.5 text-xs text-black/50 dark:text-white/50">
                {ongoing ? (
                  <span className="inline-flex items-center rounded-full bg-rose-500/15 px-2 py-0.5 font-medium text-rose-700 dark:text-rose-300">
                    läuft noch
                  </span>
                ) : (
                  <>
                    {days} {days === 1 ? "Tag" : "Tage"} Blutung
                  </>
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
                <form action={deletePeriod}>
                  <input type="hidden" name="id" value={e.id} />
                  <input type="hidden" name="ownerId" value={ownerId} />
                  <button
                    type="submit"
                    aria-label="Eintrag löschen"
                    className="rounded-md px-2 py-1 text-xs text-black/40 hover:bg-red-500/10 hover:text-red-600 dark:text-white/40"
                  >
                    ✕
                  </button>
                </form>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
