import { deleteSexEntry } from "@/app/actions/sex";
import { ConfirmSubmit } from "./confirm-submit";
import { SexDialog } from "./sex-dialog";
import { ParticipantChips } from "./sex-participants";
import { formatGermanDateWithWeekday } from "@/lib/format";
import type { SexEntry, SexPerson } from "@/lib/sex";

export function SexList({
  entries,
  today,
  nowTime,
  ownerId,
  people,
  canEdit,
}: {
  entries: SexEntry[]; // absteigend nach Tag/Uhrzeit
  today: string;
  nowTime: string;
  ownerId: string;
  people: SexPerson[];
  canEdit: boolean;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-black/15 dark:border-white/20 p-6 text-center text-sm text-black/50 dark:text-white/50">
        Noch keine Einträge.
      </div>
    );
  }

  // Nach Tag gruppieren (die Liste kommt bereits sortiert aus der DB).
  const days: { iso: string; items: SexEntry[] }[] = [];
  for (const e of entries) {
    const last = days[days.length - 1];
    if (last && last.iso === e.occurredOn) last.items.push(e);
    else days.push({ iso: e.occurredOn, items: [e] });
  }

  return (
    <div className="flex flex-col gap-3">
      {days.map((day) => (
        <div key={day.iso} className="surface-card overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-black/5 px-4 py-2 dark:border-white/10">
            <span className="text-sm font-medium">
              {formatGermanDateWithWeekday(day.iso)}
            </span>
            {day.iso === today && (
              <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300">
                Heute
              </span>
            )}
          </div>

          <ul className="divide-y divide-black/5 dark:divide-white/10">
            {day.items.map((e) => (
              <li
                key={e.id}
                className="flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
              >
                <span className="w-12 shrink-0 pt-0.5 text-sm font-medium tabular-nums">
                  {e.occurredTime}
                </span>

                <div className="flex-1">
                  <ParticipantChips participants={e.participants} />
                </div>

                {canEdit && (
                  <div className="flex shrink-0 items-center gap-1">
                    <SexDialog
                      ownerId={ownerId}
                      today={today}
                      nowTime={nowTime}
                      people={people}
                      entry={e}
                      label="Bearbeiten"
                      buttonClassName="rounded-md border border-black/15 px-2.5 py-1 text-xs font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                    />
                    <ConfirmSubmit
                      action={deleteSexEntry}
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
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
