import Link from "next/link";
import { LogoutButton } from "./logout-button";

type Page = "dashboard" | "calendar" | "medications" | "partners" | "settings";

const links: { href: string; label: string; key: Page }[] = [
  { href: "/dashboard", label: "Übersicht", key: "dashboard" },
  { href: "/calendar", label: "Kalender", key: "calendar" },
  { href: "/medications", label: "Medikamente", key: "medications" },
  { href: "/partners", label: "Partner", key: "partners" },
  { href: "/settings", label: "Einstellungen", key: "settings" },
];

export function AppShell({
  active,
  userName,
  children,
}: {
  active: Page;
  userName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-black/10 dark:border-white/15">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <nav className="flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.key}
                href={l.href}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  active === l.key
                    ? "bg-pink-600 text-white"
                    : "hover:bg-black/5 dark:hover:bg-white/10"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-black/60 dark:text-white/60 sm:inline">
              {userName}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
