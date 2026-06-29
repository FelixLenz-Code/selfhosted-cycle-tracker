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
        <div className="mx-auto max-w-3xl px-3">
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
          <nav className="no-scrollbar flex gap-1 overflow-x-auto pb-2">
            {visibleLinks.map((l) => (
              <Link
                key={l.key}
                href={l.href}
                className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  active === l.key
                    ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm shadow-violet-500/30"
                    : "text-black/70 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
