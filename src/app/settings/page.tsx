import { requireUser } from "@/lib/dal";
import { getCycleSettingsForm } from "@/lib/queries";
import { AppShell } from "@/components/app-shell";
import { PushManager } from "@/components/push-manager";
import { CycleSettingsForm } from "@/components/cycle-settings-form";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <AppShell active="settings" userName={user.displayName}>
      <h1 className="text-2xl font-semibold">Einstellungen</h1>

      {user.tracksCycle && (
        <section className="surface-card mt-6 p-5">
          <h2 className="text-lg font-medium">Hinweis-Fenster &amp; Zyklus</h2>
          <p className="mt-1 mb-4 text-sm text-black/60 dark:text-white/60">
            Lege fest, ob du Hinweise zur fruchtbaren Zeit (Kinderwunsch) oder zur
            Spaß-Zeit erhalten möchtest. Das Fenster ist frei wählbar.
          </p>
          <CycleSettingsForm settings={await getCycleSettingsForm(user.id)} />
        </section>
      )}

      <section className="surface-card mt-8 p-5">
        <h2 className="text-lg font-medium">Push-Benachrichtigungen</h2>
        <p className="mt-1 mb-4 text-sm text-black/60 dark:text-white/60">
          Aktiviere Benachrichtigungen auf diesem Gerät (für Medikamenten- und
          GV-Hinweise). Funktioniert nur über HTTPS bzw. localhost.
        </p>
        <PushManager vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
      </section>
    </AppShell>
  );
}
