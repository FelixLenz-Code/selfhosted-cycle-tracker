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
      <header className="sticky top-0 z-20 border-b border-black/10 dark:border-white/15 bg-white/80 dark:bg-black/70 backdrop-blur">
        <div className="mx-auto max-w-3xl px-3">
          <div className="flex items-center justify-between gap-2 py-2">
            <Link href="/dashboard" className="font-semibold tracking-tight">
              Zyklus
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
                className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${
                  active === l.key
                    ? "bg-violet-600 text-white"
                    : "hover:bg-black/5 dark:hover:bg-white/10"
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
