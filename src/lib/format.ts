// Anzeige-Formatierung für ISO-Date-Strings ("YYYY-MM-DD"), immer in UTC,
// damit reine Kalenderdaten nicht durch die lokale Zeitzone verschoben werden.

export function formatGermanDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatGermanShort(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

export function formatMonthLabel(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
