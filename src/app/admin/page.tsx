import { requireAdmin } from "@/lib/dal";
import { listUsers } from "@/lib/admin-queries";
import { isRegistrationEnabled } from "@/lib/app-settings";
import { setRegistration } from "@/app/actions/admin";
import { AppShell } from "@/components/app-shell";
import { AdminUserItem } from "@/components/admin-user-item";
import { AdminBackup } from "@/components/admin-backup";

export default async function AdminPage() {
  const admin = await requireAdmin();
  const [usersList, registrationEnabled] = await Promise.all([
    listUsers(),
    isRegistrationEnabled(),
  ]);
  const adminCount = usersList.filter((u) => u.isAdmin).length;

  return (
    <AppShell active="admin" userName={admin.displayName}>
      <h1 className="text-2xl font-semibold">Administration</h1>

      <section className="surface-card mt-6 p-5">
        <h2 className="text-lg font-medium">Registrierung</h2>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          {registrationEnabled
            ? "Neue Nutzer können sich derzeit selbst registrieren."
            : "Selbst-Registrierung ist deaktiviert — niemand kann neue Konten anlegen."}
        </p>
        <form action={setRegistration} className="mt-3">
          <input type="hidden" name="enabled" value={(!registrationEnabled).toString()} />
          <button
            type="submit"
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              registrationEnabled
                ? "border border-black/15 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10"
                : "bg-violet-600 text-white hover:bg-violet-700"
            }`}
          >
            {registrationEnabled ? "Registrierung deaktivieren" : "Registrierung aktivieren"}
          </button>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Benutzer ({usersList.length})</h2>
        <ul className="mt-3 surface-card overflow-hidden divide-y divide-black/5 dark:divide-white/10">
          {usersList.map((u) => (
            <AdminUserItem
              key={u.id}
              user={{
                id: u.id,
                email: u.email,
                displayName: u.displayName,
                tracksCycle: u.tracksCycle,
                isAdmin: u.isAdmin,
                createdAt: new Date(u.createdAt).toLocaleDateString("de-DE"),
              }}
              currentUserId={admin.id}
              adminCount={adminCount}
            />
          ))}
        </ul>
      </section>

      <AdminBackup />
    </AppShell>
  );
}
