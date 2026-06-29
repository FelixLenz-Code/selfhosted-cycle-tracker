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
  includeSelf = true,
}: {
  basePath: string;
  selfId: string;
  selfName: string;
  linkedOwners: SwitcherOwner[];
  activeOwnerId: string;
  includeSelf?: boolean;
}) {
  // Ohne eigenen Zyklus und ohne Freigaben gibt es nichts umzuschalten.
  if (linkedOwners.length === 0) return null;
  if (!includeSelf && linkedOwners.length < 2) return null;

  const tabs = includeSelf
    ? [{ ownerId: selfId, ownerName: `${selfName} (du)` }, ...linkedOwners]
    : linkedOwners;

  return (
    <div className="mt-4 flex flex-wrap gap-1">
      {tabs.map((t) => {
        const isActive = t.ownerId === activeOwnerId;
        const href = t.ownerId === selfId ? basePath : `${basePath}?owner=${t.ownerId}`;
        return (
          <Link
            key={t.ownerId}
            href={href}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm shadow-violet-500/30"
                : "border border-[var(--border-strong)] hover:bg-black/5 dark:hover:bg-white/10"
            }`}
          >
            {t.ownerName}
          </Link>
        );
      })}
    </div>
  );
}
