import { requireUser } from "@/lib/dal";
import { getPeriodEntries, getCycleSettings } from "@/lib/queries";
import { computeCycleStats, todayISO } from "@/lib/cycle";
import { AppShell } from "@/components/app-shell";
import { CycleOverview } from "@/components/cycle-overview";
import { PeriodForm } from "@/components/period-form";
import { PeriodList } from "@/components/period-list";

export default async function DashboardPage() {
  const user = await requireUser();
  const [entries, settings] = await Promise.all([
    getPeriodEntries(user.id),
    getCycleSettings(user.id),
  ]);

  const today = todayISO();
  const stats = computeCycleStats(entries, settings, today);

  return (
    <AppShell active="dashboard" userName={user.displayName}>
      <h1 className="text-2xl font-semibold">Hallo, {user.displayName}</h1>

      <section className="mt-6">
        <CycleOverview stats={stats} />
      </section>

      <section className="mt-8 rounded-xl border border-black/10 dark:border-white/15 p-5">
        <h2 className="text-lg font-medium">Blutung eintragen</h2>
        <div className="mt-3">
          <PeriodForm today={today} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Verlauf</h2>
        <div className="mt-2">
          <PeriodList entries={entries} today={today} />
        </div>
      </section>
    </AppShell>
  );
}
