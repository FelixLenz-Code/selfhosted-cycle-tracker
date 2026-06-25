import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { getPeriodEntries, getCycleSettings } from "@/lib/queries";
import { computeCycleStats, todayISO } from "@/lib/cycle";
import { formatMonthLabel } from "@/lib/format";
import { AppShell } from "@/components/app-shell";
import { CycleCalendar } from "@/components/cycle-calendar";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function normalizeMonth(m: string | undefined): string {
  if (m && /^\d{4}-\d{2}$/.test(m)) return `${m}-01`;
  const now = new Date();
  return `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-01`;
}

function shiftMonth(monthStart: string, delta: number): string {
  const [year, month] = monthStart.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const user = await requireUser();
  const { m } = await searchParams;
  const monthStart = normalizeMonth(m);

  const [entries, settings] = await Promise.all([
    getPeriodEntries(user.id),
    getCycleSettings(user.id),
  ]);
  const stats = computeCycleStats(entries, settings, todayISO());

  const prev = shiftMonth(monthStart, -1);
  const next = shiftMonth(monthStart, 1);

  return (
    <AppShell active="calendar" userName={user.displayName}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Kalender</h1>
        <div className="flex items-center gap-1">
          <Link
            href={`/calendar?m=${prev}`}
            className="rounded-md border border-black/15 dark:border-white/20 px-2.5 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Vorheriger Monat"
          >
            ‹
          </Link>
          <span className="min-w-40 text-center text-sm font-medium">
            {formatMonthLabel(monthStart)}
          </span>
          <Link
            href={`/calendar?m=${next}`}
            className="rounded-md border border-black/15 dark:border-white/20 px-2.5 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Nächster Monat"
          >
            ›
          </Link>
        </div>
      </div>

      <section className="mt-6 rounded-xl border border-black/10 dark:border-white/15 p-4">
        <CycleCalendar monthStart={monthStart} entries={entries} stats={stats} />
      </section>
    </AppShell>
  );
}
