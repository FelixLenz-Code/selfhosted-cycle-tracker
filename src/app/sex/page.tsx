import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/dal";
import {
  resolveOwnerAccess,
  getLinkedOwners,
  getParticipantCandidates,
} from "@/lib/access";
import { getSexEntries } from "@/lib/queries";
import { todayISO } from "@/lib/cycle";
import { currentTimeHHMM } from "@/lib/sex";
import { AppShell } from "@/components/app-shell";
import { OwnerSwitcher } from "@/components/owner-switcher";
import { SexDialog } from "@/components/sex-dialog";
import { SexList } from "@/components/sex-list";

export default async function SexPage({
  searchParams,
}: {
  searchParams: Promise<{ owner?: string }>;
}) {
  const user = await requireUser();
  const { owner } = await searchParams;

  const access = await resolveOwnerAccess(user, owner);
  if (!access) redirect("/sex");

  const linkedOwners = await getLinkedOwners(user.id);

  // Begleiter ohne eigenen Zyklus: Einträge gehören immer zur begleiteten Person.
  if (access.isSelf && !user.tracksCycle) {
    if (linkedOwners.length > 0) redirect(`/sex?owner=${linkedOwners[0].ownerId}`);
    return (
      <AppShell active="sex" userName={user.displayName}>
        <h1 className="text-2xl font-semibold">Sex</h1>
        <div className="surface-card mt-6 p-6 text-sm text-black/70 dark:text-white/70">
          <p>
            Du trackst keinen eigenen Zyklus. Sobald dich die Person, die du
            begleitest, freigibt, kannst du hier Einträge sehen und ergänzen.
          </p>
          <Link href="/partners" className="btn-primary mt-4">
            Zu „Partner“
          </Link>
        </div>
      </AppShell>
    );
  }

  const [entries, people] = await Promise.all([
    getSexEntries(access.ownerId),
    getParticipantCandidates(access.ownerId),
  ]);
  const today = todayISO();
  const nowTime = currentTimeHHMM();

  return (
    <AppShell active="sex" userName={user.displayName}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          Sex{access.isSelf ? "" : ` – ${access.ownerName}`}
        </h1>
        {access.canEdit && (
          <SexDialog
            ownerId={access.ownerId}
            today={today}
            nowTime={nowTime}
            people={people}
            label="＋ Eintragen"
          />
        )}
      </div>

      <OwnerSwitcher
        basePath="/sex"
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
        <h2 className="text-lg font-semibold">Verlauf</h2>
        <div className="mt-2">
          <SexList
            entries={entries}
            today={today}
            nowTime={nowTime}
            ownerId={access.ownerId}
            people={people}
            canEdit={access.canEdit}
          />
        </div>
      </section>
    </AppShell>
  );
}
