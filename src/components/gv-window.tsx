import Link from "next/link";
import { formatGermanDate } from "@/lib/format";
import { todayISO, diffDays } from "@/lib/cycle";
import type { CycleStats } from "@/lib/cycle";

// Dashboard-Karte für das vom Modus fokussierte Fenster:
// Kinderwunsch -> fruchtbare Zeit, sonst -> Spaß-Zeit. Beide Fenster sind
// zusätzlich immer im Kalender sichtbar.
export function GvWindow({ stats }: { stats: CycleStats }) {
  const isTtc = stats.mode === "ttc";
  const window = isTtc ? stats.fertileWindow : stats.gvWindow;
  if (!window) return null;

  const today = todayISO();
  const inWindow = diffDays(today, window.start) >= 0 && diffDays(window.end, today) >= 0;
  const daysToStart = diffDays(window.start, today);

  const title = isTtc ? "Fruchtbare Zeit (Kinderwunsch)" : "Spaß-Zeit";

  let statusText: string;
  if (inWindow) statusText = isTtc ? "Heute in der fruchtbaren Zeit." : "Heute in der Spaß-Zeit.";
  else if (daysToStart > 0) statusText = `Beginnt in ${daysToStart} Tagen.`;
  else statusText = "Aktuell außerhalb des Fensters.";

  return (
    <div
      className={`rounded-xl border p-4 ${
        inWindow
          ? isTtc
            ? "border-green-500/50 bg-green-500/10"
            : "border-violet-500/50 bg-violet-500/10"
          : "border-black/10 dark:border-white/15"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium">{title}</h3>
        <Link href="/settings" className="text-xs text-violet-600 hover:underline">
          anpassen
        </Link>
      </div>
      <p className="mt-1 text-sm">
        {formatGermanDate(window.start)} – {formatGermanDate(window.end)}
      </p>
      <p className="mt-0.5 text-sm text-black/60 dark:text-white/60">{statusText}</p>
      {!isTtc && (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
          Keine sichere Verhütung – nur als Orientierung.
        </p>
      )}
    </div>
  );
}
