import { Logo } from "./logo";

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-5 flex flex-col items-center gap-3 text-center">
          <Logo className="h-14 w-14 rounded-2xl shadow-lg shadow-violet-500/25" />
          <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-lg font-semibold tracking-tight text-transparent dark:from-violet-300 dark:to-fuchsia-300">
            Zyklus
          </span>
        </div>
        <div className="surface-card p-7" style={{ boxShadow: "var(--shadow-lg)" }}>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="mt-1 mb-5 text-sm text-black/60 dark:text-white/60">
              {subtitle}
            </p>
          )}
          {children}
        </div>
      </div>
    </main>
  );
}
