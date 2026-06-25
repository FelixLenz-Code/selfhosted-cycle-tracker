import { requireUser } from "@/lib/dal";
import { AppShell } from "@/components/app-shell";
import { PushManager } from "@/components/push-manager";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <AppShell active="settings" userName={user.displayName}>
      <h1 className="text-2xl font-semibold">Einstellungen</h1>

      <section className="mt-6 rounded-xl border border-black/10 dark:border-white/15 p-5">
        <h2 className="text-lg font-medium">Push-Benachrichtigungen</h2>
        <p className="mt-1 mb-4 text-sm text-black/60 dark:text-white/60">
          Aktiviere Benachrichtigungen auf diesem Gerät (z. B. später für
          Medikamenten-Erinnerungen). Funktioniert nur über HTTPS bzw. localhost.
        </p>
        <PushManager />
      </section>
    </AppShell>
  );
}
