import Link from "next/link";

export type SwitcherOwner = { ownerId: string; ownerName: string };

// Zeigt Tabs zum Umschalten zwischen eigenen Daten und freigegebenen Owner-Daten.
// Wird nur gerendert, wenn überhaupt freigegebene Owner existieren.
export function OwnerSwitcher({
  basePath,
  selfId,
  selfName,
  linkedOwners,
  activeOwnerId,
}: {
  basePath: string;
  selfId: string;
  selfName: string;
  linkedOwners: SwitcherOwner[];
  activeOwnerId: string;
}) {
  if (linkedOwners.length === 0) return null;

  const tabs = [{ ownerId: selfId, ownerName: `${selfName} (du)` }, ...linkedOwners];

  return (
    <div className="mt-4 flex flex-wrap gap-1">
      {tabs.map((t) => {
        const isActive = t.ownerId === activeOwnerId;
        const href = t.ownerId === selfId ? basePath : `${basePath}?owner=${t.ownerId}`;
        return (
          <Link
            key={t.ownerId}
            href={href}
            className={`rounded-full px-3 py-1 text-sm ${
              isActive
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "border border-black/15 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10"
            }`}
          >
            {t.ownerName}
          </Link>
        );
      })}
    </div>
  );
}
