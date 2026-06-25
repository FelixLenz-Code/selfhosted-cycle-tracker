import { requireUser } from "@/lib/dal";
import { getMedications } from "@/lib/medications-queries";
import { AppShell } from "@/components/app-shell";
import { MedicationForm } from "@/components/medication-form";
import { MedicationItem } from "@/components/medication-item";

export default async function MedicationsPage() {
  const user = await requireUser();
  const meds = await getMedications(user.id);

  return (
    <AppShell active="medications" userName={user.displayName}>
      <h1 className="text-2xl font-semibold">Medikamente</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Lege Medikamente mit Erinnerungszeiten an. Aktiviere dazu Push-Benachrichtigungen
        unter „Einstellungen“ – der Hintergrund-Worker schickt die Erinnerungen.
      </p>

      <section className="mt-6 rounded-xl border border-black/10 dark:border-white/15 p-5">
        <h2 className="text-lg font-medium">Neues Medikament</h2>
        <div className="mt-3">
          <MedicationForm />
        </div>
      </section>

      <section className="mt-8">
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
