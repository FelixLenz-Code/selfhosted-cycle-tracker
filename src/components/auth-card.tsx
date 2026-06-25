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
      <div className="w-full max-w-sm rounded-xl border border-black/10 dark:border-white/15 p-6 shadow-sm">
        <h1 className="text-xl font-semibold">{title}</h1>
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
