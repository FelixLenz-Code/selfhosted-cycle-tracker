import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { LogoutButton } from "./logout-button";

type Page = "dashboard" | "calendar" | "medications" | "partners" | "settings" | "admin";

const links: { href: string; label: string; key: Page; adminOnly?: boolean }[] = [
  { href: "/dashboard", label: "Übersicht", key: "dashboard" },
  { href: "/calendar", label: "Kalender", key: "calendar" },
  { href: "/medications", label: "Medikamente", key: "medications" },
  { href: "/partners", label: "Partner", key: "partners" },
  { href: "/settings", label: "Einstellungen", key: "settings" },
  { href: "/admin", label: "Admin", key: "admin", adminOnly: true },
];

// Kurze Labels für die platzsparende mobile Tab-Leiste.
const SHORT_LABEL: Record<Page, string> = {
  dashboard: "Start",
  calendar: "Kalender",
  medications: "Medis",
  partners: "Partner",
  settings: "Einstellungen",
  admin: "Admin",
};

// Schlanke Strich-Icons (currentColor) – funktionieren in Top- und Bottom-Nav.
const ICON_PATHS: Record<Page, React.ReactNode> = {
  dashboard: (
    <>
      <path d="M3 10.5 12 4l9 6.5" />
      <path d="M5.5 9.5V19a1 1 0 0 0 1 1H9v-5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v5h2.5a1 1 0 0 0 1-1V9.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v3M16 3v3" />
    </>
  ),
  medications: (
    <>
      <path d="M10.5 3.5 3.5 10.5a4.95 4.95 0 0 0 7 7l7-7a4.95 4.95 0 0 0-7-7Z" />
      <path d="M7 7l7 7" />
    </>
  ),
  partners: (
    <path d="M12 20s-7-4.3-7-9.4A3.6 3.6 0 0 1 12 7a3.6 3.6 0 0 1 7 3.6C19 15.7 12 20 12 20Z" />
  ),
  settings: (
    <>
      <path d="M6 4v16M12 4v16M18 4v16" />
      <circle cx="6" cy="9" r="2" />
      <circle cx="12" cy="15" r="2" />
      <circle cx="18" cy="7" r="2" />
    </>
  ),
  admin: <path d="M12 3 5 6v5c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6l-7-3Z" />,
};

function Icon({ page, className }: { page: Page; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {ICON_PATHS[page]}
    </svg>
  );
}

export async function AppShell({
  active,
  userName,
  children,
}: {
  active: Page;
  userName: string;
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const visibleLinks = links.filter((l) => !l.adminOnly || user?.isAdmin);
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)]/70 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-3 sm:px-4">
          <div className="flex items-center justify-between gap-2 py-2.5">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 font-semibold tracking-tight"
            >
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 text-sm text-white shadow-sm shadow-violet-500/30">
                ♥
              </span>
              <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent dark:from-violet-300 dark:to-fuchsia-300">
                Zyklus
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-black/60 dark:text-white/60 sm:inline">
                {userName}
              </span>
              <LogoutButton />
            </div>
          </div>
          {/* Desktop/Tablet: Pill-Navigation oben. Auf dem Handy via Bottom-Bar. */}
          <nav className="no-scrollbar hidden gap-1 overflow-x-auto pb-2 md:flex">
            {visibleLinks.map((l) => (
              <Link
                key={l.key}
                href={l.href}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  active === l.key
                    ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm shadow-violet-500/30"
                    : "text-black/70 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10"
                }`}
              >
                <Icon page={l.key} className="h-4 w-4" />
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 pb-28 md:pb-10">{children}</main>

      {/* Mobile: fixierte Tab-Leiste unten mit Safe-Area-Abstand. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--surface)]/85 backdrop-blur-xl md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Hauptnavigation"
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around px-1">
          {visibleLinks.map((l) => {
            const isActive = active === l.key;
            return (
              <Link
                key={l.key}
                href={l.href}
                aria-current={isActive ? "page" : undefined}
                className={`group flex flex-1 flex-col items-center gap-0.5 pb-1.5 pt-2 transition-colors ${
                  isActive
                    ? "text-violet-600 dark:text-violet-300"
                    : "text-black/55 dark:text-white/55"
                }`}
              >
                <span
                  className={`grid h-8 w-12 place-items-center rounded-full transition-colors ${
                    isActive ? "bg-violet-500/15 dark:bg-violet-400/20" : ""
                  }`}
                >
                  <Icon page={l.key} className="h-[22px] w-[22px]" />
                </span>
                <span className="text-[10px] font-medium leading-none">
                  {SHORT_LABEL[l.key]}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
