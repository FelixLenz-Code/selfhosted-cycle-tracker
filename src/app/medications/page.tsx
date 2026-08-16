import { requireUser } from "@/lib/dal";
import { getMedications } from "@/lib/medications-queries";
import { AppShell } from "@/components/app-shell";
import { MedicationAdd } from "@/components/medication-add";
import { MedicationItem } from "@/components/medication-item";

export default async function MedicationsPage() {
  const user = await requireUser();
  const meds = await getMedications(user.id);

  return (
    <AppShell active="medications" userName={user.displayName}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Medikamente</h1>
        <MedicationAdd />
      </div>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Lege Medikamente mit Erinnerungszeiten an. Aktiviere dazu Push-Benachrichtigungen
        unter „Einstellungen“ – der Hintergrund-Worker schickt die Erinnerungen.
      </p>

      <section className="mt-6">
        <h2 className="text-lg font-medium">Deine Medikamente</h2>
        {meds.length === 0 ? (
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            Noch keine Medikamente angelegt.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col divide-y divide-black/10 dark:divide-white/10">
            {meds.map((m) => (
              <MedicationItem key={m.id} medication={m} />
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
