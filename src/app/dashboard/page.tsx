import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { resolveOwnerAccess, getLinkedOwners } from "@/lib/access";
import { getPeriodEntries, getCycleSettings } from "@/lib/queries";
import { computeCycleStats, todayISO } from "@/lib/cycle";
import { AppShell } from "@/components/app-shell";
import { CycleOverview } from "@/components/cycle-overview";
import { GvWindow } from "@/components/gv-window";
import { PeriodForm } from "@/components/period-form";
import { PeriodList } from "@/components/period-list";
import { OwnerSwitcher } from "@/components/owner-switcher";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ owner?: string }>;
}) {
  const user = await requireUser();
  const { owner } = await searchParams;

  const access = await resolveOwnerAccess(user, owner);
  if (!access) redirect("/dashboard");

  const linkedOwners = await getLinkedOwners(user.id);

  // Begleiter ohne eigenen Zyklus: eigene Ansicht hat keine Zyklusdaten.
  if (access.isSelf && !user.tracksCycle) {
    if (linkedOwners.length > 0) {
      redirect(`/dashboard?owner=${linkedOwners[0].ownerId}`);
    }
    return (
      <AppShell active="dashboard" userName={user.displayName}>
        <h1 className="text-2xl font-semibold">Hallo, {user.displayName}</h1>
        <div className="surface-card mt-6 p-6 text-sm text-black/70 dark:text-white/70">
          <p>
            Du trackst keinen eigenen Zyklus. Sobald dich die Person, die du
            begleitest, freigibt, siehst du hier ihre Daten.
          </p>
          <Link href="/partners" className="btn-primary mt-4">
            Zu „Partner"
          </Link>
        </div>
      </AppShell>
    );
  }

  const [entries, settings] = await Promise.all([
    getPeriodEntries(access.ownerId),
    getCycleSettings(access.ownerId),
  ]);

  const today = todayISO();
  const stats = computeCycleStats(entries, settings, today);

  return (
    <AppShell active="dashboard" userName={user.displayName}>
      <h1 className="text-2xl font-semibold">
        {access.isSelf ? `Hallo, ${user.displayName}` : `Zyklus von ${access.ownerName}`}
      </h1>

      <OwnerSwitcher
        basePath="/dashboard"
        selfId={user.id}
        selfName={user.displayName}
        linkedOwners={linkedOwners}
        activeOwnerId={access.ownerId}
        includeSelf={user.tracksCycle}
      />

      {!access.isSelf && (
        <p className="mt-3 rounded-lg bg-black/5 dark:bg-white/10 px-3 py-2 text-sm">
          Du siehst die freigegebenen Daten von <strong>{access.ownerName}</strong>
          {access.canEdit ? " und darfst Einträge bearbeiten." : " (nur lesend)."}
        </p>
      )}

      <section className="mt-6">
        <CycleOverview stats={stats} />
      </section>

      {(stats.fertileWindow || stats.gvWindow) && (
        <section className="mt-4">
          <GvWindow stats={stats} />
        </section>
      )}

      {access.canEdit && (
        <section className="surface-card mt-8 p-5">
          <h2 className="text-lg font-semibold">Blutung eintragen</h2>
          <div className="mt-3">
            <PeriodForm today={today} ownerId={access.ownerId} />
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Verlauf</h2>
        <div className="mt-2">
          <PeriodList
            entries={entries}
            today={today}
            ownerId={access.ownerId}
            canEdit={access.canEdit}
          />
        </div>
      </section>
    </AppShell>
  );
}
