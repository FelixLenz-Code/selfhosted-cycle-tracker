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

// Kurzer Wochentag ohne abschließenden Punkt: "Mo", "Di", … "So".
export function formatGermanWeekday(iso: string): string {
  return new Date(`${iso}T00:00:00Z`)
    .toLocaleDateString("de-DE", { weekday: "short", timeZone: "UTC" })
    .replace(/\.$/, "");
}

// Wochentag + Datum, z. B. "Mo, 01.03.2026".
export function formatGermanDateWithWeekday(iso: string): string {
  return `${formatGermanWeekday(iso)}, ${formatGermanDate(iso)}`;
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
