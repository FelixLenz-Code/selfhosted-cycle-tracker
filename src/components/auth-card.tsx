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
      <div className="surface-card w-full max-w-sm p-7" style={{ boxShadow: "var(--shadow-lg)" }}>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-1 mb-5 text-sm text-black/60 dark:text-white/60">
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </main>
  );
}
