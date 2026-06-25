import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { resolveOwnerAccess, getLinkedOwners } from "@/lib/access";
import { getPeriodEntries, getCycleSettings } from "@/lib/queries";
import { computeCycleStats, todayISO } from "@/lib/cycle";
import { formatMonthLabel } from "@/lib/format";
import { AppShell } from "@/components/app-shell";
import { CycleCalendar } from "@/components/cycle-calendar";
import { OwnerSwitcher } from "@/components/owner-switcher";

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
  searchParams: Promise<{ m?: string; owner?: string }>;
}) {
  const user = await requireUser();
  const { m, owner } = await searchParams;

  const access = await resolveOwnerAccess(user, owner);
  if (!access) redirect("/calendar");

  const monthStart = normalizeMonth(m);
  const ownerQuery = access.isSelf ? "" : `&owner=${access.ownerId}`;

  const [entries, settings, linkedOwners] = await Promise.all([
    getPeriodEntries(access.ownerId),
    getCycleSettings(access.ownerId),
    getLinkedOwners(user.id),
  ]);
  const stats = computeCycleStats(entries, settings, todayISO());

  const prev = shiftMonth(monthStart, -1);
  const next = shiftMonth(monthStart, 1);

  return (
    <AppShell active="calendar" userName={user.displayName}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Kalender{access.isSelf ? "" : ` – ${access.ownerName}`}
        </h1>
        <div className="flex items-center gap-1">
          <Link
            href={`/calendar?m=${prev}${ownerQuery}`}
            className="rounded-md border border-black/15 dark:border-white/20 px-2.5 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Vorheriger Monat"
          >
            ‹
          </Link>
          <span className="min-w-40 text-center text-sm font-medium">
            {formatMonthLabel(monthStart)}
          </span>
          <Link
            href={`/calendar?m=${next}${ownerQuery}`}
            className="rounded-md border border-black/15 dark:border-white/20 px-2.5 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Nächster Monat"
          >
            ›
          </Link>
        </div>
      </div>

      <OwnerSwitcher
        basePath="/calendar"
        selfId={user.id}
        selfName={user.displayName}
        linkedOwners={linkedOwners}
        activeOwnerId={access.ownerId}
      />

      <section className="mt-6 rounded-xl border border-black/10 dark:border-white/15 p-4">
        <CycleCalendar monthStart={monthStart} entries={entries} stats={stats} />
      </section>
    </AppShell>
  );
}
