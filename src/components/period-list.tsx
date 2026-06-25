import { endPeriod, deletePeriod } from "@/app/actions/periods";
import { formatGermanDate } from "@/lib/format";
import { diffDays } from "@/lib/cycle";
import type { PeriodEntryLite } from "@/lib/cycle";

export function PeriodList({
  entries,
  today,
}: {
  entries: PeriodEntryLite[];
  today: string;
}) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-black/60 dark:text-white/60">
        Noch keine Einträge. Trage oben deine erste Blutung ein.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
      {entries.map((e) => {
        const days =
          e.endDate !== null ? diffDays(e.endDate, e.startDate) + 1 : null;
        return (
          <li key={e.id} className="flex items-center justify-between gap-3 py-3">
            <div className="text-sm">
              <span className="font-medium">{formatGermanDate(e.startDate)}</span>
              {e.endDate ? (
                <>
                  {" – "}
                  <span className="font-medium">{formatGermanDate(e.endDate)}</span>
                  <span className="ml-2 text-black/50 dark:text-white/50">
                    ({days} {days === 1 ? "Tag" : "Tage"})
                  </span>
                </>
              ) : (
                <span className="ml-2 rounded-full bg-pink-600/15 px-2 py-0.5 text-xs text-pink-700 dark:text-pink-300">
                  läuft noch
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {e.endDate === null && (
                <form action={endPeriod}>
                  <input type="hidden" name="id" value={e.id} />
                  <input type="hidden" name="endDate" value={today} />
                  <button
                    type="submit"
                    className="rounded-md border border-black/15 dark:border-white/20 px-2.5 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    Heute beenden
                  </button>
                </form>
              )}
              <form action={deletePeriod}>
                <input type="hidden" name="id" value={e.id} />
                <button
                  type="submit"
                  className="rounded-md px-2.5 py-1 text-xs text-red-600 hover:bg-red-500/10"
                >
                  Löschen
                </button>
              </form>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
