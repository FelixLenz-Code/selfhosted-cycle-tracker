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

  const linkedOwners = await getLinkedOwners(user.id);

  // Begleiter ohne eigenen Zyklus -> auf eine freigegebene Person umleiten.
  if (access.isSelf && !user.tracksCycle) {
    if (linkedOwners.length > 0) redirect(`/calendar?owner=${linkedOwners[0].ownerId}`);
    redirect("/dashboard");
  }

  const monthStart = normalizeMonth(m);
  const ownerQuery = access.isSelf ? "" : `&owner=${access.ownerId}`;

  const [entries, settings] = await Promise.all([
    getPeriodEntries(access.ownerId),
    getCycleSettings(access.ownerId),
  ]);
  const stats = computeCycleStats(entries, settings, todayISO());

  const prev = shiftMonth(monthStart, -1);
  const next = shiftMonth(monthStart, 1);

  return (
    <AppShell active="calendar" userName={user.displayName}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          Kalender{access.isSelf ? "" : ` – ${access.ownerName}`}
        </h1>
        <div className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1 shadow-sm">
          <Link
            href={`/calendar?m=${prev}${ownerQuery}`}
            className="grid h-8 w-8 place-items-center rounded-full text-lg leading-none hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Vorheriger Monat"
          >
            ‹
          </Link>
          <span className="min-w-36 text-center text-sm font-semibold">
            {formatMonthLabel(monthStart)}
          </span>
          <Link
            href={`/calendar?m=${next}${ownerQuery}`}
            className="grid h-8 w-8 place-items-center rounded-full text-lg leading-none hover:bg-black/5 dark:hover:bg-white/10"
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
        includeSelf={user.tracksCycle}
      />

      <section className="surface-card mt-6 p-4 sm:p-5">
        <CycleCalendar monthStart={monthStart} entries={entries} stats={stats} />
      </section>
    </AppShell>
  );
}
