import { requireUser } from "@/lib/dal";
import { LogoutButton } from "@/components/logout-button";

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Hallo, {user.displayName}</h1>
          <p className="text-sm text-black/60 dark:text-white/60">{user.email}</p>
        </div>
        <LogoutButton />
      </header>

      <section className="mt-10 rounded-xl border border-black/10 dark:border-white/15 p-6">
        <h2 className="text-lg font-medium">Dein Zyklus</h2>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          Hier entsteht in Phase 1 der Zyklus-Kern: Blutung eintragen, Verlauf und
          Vorhersagen. Aktuell ist die Basis (Konten &amp; Anmeldung) fertig.
        </p>
      </section>
    </main>
  );
}
