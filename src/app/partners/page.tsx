import { requireUser } from "@/lib/dal";
import { getIncomingInvites, getOutgoingLinks } from "@/lib/access";
import { AppShell } from "@/components/app-shell";
import { InviteForm } from "@/components/invite-form";
import {
  acceptInvite,
  declineInvite,
  revokeLink,
  setEditPermission,
} from "@/app/actions/partners";

const statusLabel: Record<string, string> = {
  pending: "ausstehend",
  accepted: "aktiv",
  revoked: "widerrufen",
};

export default async function PartnersPage() {
  const user = await requireUser();
  const [incoming, outgoing] = await Promise.all([
    getIncomingInvites(user.id, user.email.toLowerCase()),
    getOutgoingLinks(user.id),
  ]);

  return (
    <AppShell active="partners" userName={user.displayName}>
      <h1 className="text-2xl font-semibold">Partner</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Lade deinen Partner ein, deine Zyklusdaten anzusehen – und optional auch zu
        bearbeiten.
      </p>

      {incoming.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-medium">Einladungen an dich</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {incoming.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-black/10 dark:border-white/15 p-3"
              >
                <span className="text-sm">
                  <strong>{inv.ownerName}</strong> möchte dir Zugriff geben
                  {inv.canEdit ? " (ansehen + bearbeiten)" : " (nur ansehen)"}.
                </span>
                <div className="flex gap-2">
                  <form action={acceptInvite}>
                    <input type="hidden" name="id" value={inv.id} />
                    <button
                      type="submit"
                      className="rounded-md bg-violet-600 px-3 py-1 text-sm text-white hover:bg-violet-700"
                    >
                      Annehmen
                    </button>
                  </form>
                  <form action={declineInvite}>
                    <input type="hidden" name="id" value={inv.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-black/15 dark:border-white/20 px-3 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      Ablehnen
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8 rounded-xl border border-black/10 dark:border-white/15 p-5">
        <h2 className="text-lg font-medium">Partner einladen</h2>
        <div className="mt-3">
          <InviteForm />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Deine Freigaben</h2>
        {outgoing.length === 0 ? (
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            Du hast noch niemanden eingeladen.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col divide-y divide-black/10 dark:divide-white/10">
            {outgoing.map((link) => (
              <li key={link.id} className="flex items-center justify-between gap-3 py-3">
                <div className="text-sm">
                  <div className="font-medium">
                    {link.partnerName ?? link.invitedEmail}
                  </div>
                  <div className="text-xs text-black/50 dark:text-white/50">
                    {statusLabel[link.status] ?? link.status} ·{" "}
                    {link.canEdit ? "ansehen + bearbeiten" : "nur ansehen"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {link.status === "accepted" && (
                    <form action={setEditPermission}>
                      <input type="hidden" name="id" value={link.id} />
                      <input
                        type="hidden"
                        name="canEdit"
                        value={(!link.canEdit).toString()}
                      />
                      <button
                        type="submit"
                        className="rounded-md border border-black/15 dark:border-white/20 px-2.5 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10"
                      >
                        {link.canEdit ? "Bearbeiten entziehen" : "Bearbeiten erlauben"}
                      </button>
                    </form>
                  )}
                  <form action={revokeLink}>
                    <input type="hidden" name="id" value={link.id} />
                    <button
                      type="submit"
                      className="rounded-md px-2.5 py-1 text-xs text-red-600 hover:bg-red-500/10"
                    >
                      Entfernen
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
