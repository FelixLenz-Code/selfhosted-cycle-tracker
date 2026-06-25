import Link from "next/link";
import { formatGermanDate } from "@/lib/format";
import { todayISO, diffDays } from "@/lib/cycle";
import type { CycleStats } from "@/lib/cycle";

export function GvWindow({ stats }: { stats: CycleStats }) {
  if (!stats.gvWindow) return null;

  const today = todayISO();
  const inWindow =
    diffDays(today, stats.gvWindow.start) >= 0 && diffDays(stats.gvWindow.end, today) >= 0;
  const daysToStart = diffDays(stats.gvWindow.start, today);

  const isTtc = stats.mode === "ttc";
  const title = isTtc ? "Günstige Zeit (Kinderwunsch)" : "Vermeidungs-Fenster";

  let statusText: string;
  if (inWindow) statusText = isTtc ? "Heute im fruchtbaren Fenster." : "Heute im Vermeidungs-Fenster.";
  else if (daysToStart > 0) statusText = `Beginnt in ${daysToStart} Tagen.`;
  else statusText = "Aktuell außerhalb des Fensters.";

  return (
    <div
      className={`rounded-xl border p-4 ${
        inWindow
          ? isTtc
            ? "border-green-500/50 bg-green-500/10"
            : "border-amber-500/50 bg-amber-500/10"
          : "border-black/10 dark:border-white/15"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium">{title}</h3>
        <Link href="/settings" className="text-xs text-pink-600 hover:underline">
          anpassen
        </Link>
      </div>
      <p className="mt-1 text-sm">
        {formatGermanDate(stats.gvWindow.start)} – {formatGermanDate(stats.gvWindow.end)}
      </p>
      <p className="mt-0.5 text-sm text-black/60 dark:text-white/60">{statusText}</p>
      {!isTtc && (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
          Kein sicheres Verhütungsmittel – nur als Orientierung.
        </p>
      )}
    </div>
  );
}
