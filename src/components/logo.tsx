// Einheitliches App-Logo: Gradient-Badge mit Herz und Zyklus-Marker.
// Wird in Header und Login verwendet; die App-Icons (Favicon/PWA/Apple)
// teilen dasselbe Motiv.
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Zyklus"
    >
      <defs>
        <linearGradient id="zyklus-logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#d946ef" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#zyklus-logo-grad)" />
      <path
        d="M32 47c-2-1.6-16-10-16-20.5A8.5 8.5 0 0 1 32 22 8.5 8.5 0 0 1 48 26.5C48 37 34 45.4 32 47Z"
        fill="#fff"
      />
      <circle cx="48" cy="16" r="3.5" fill="#fff" opacity="0.92" />
    </svg>
  );
}
