// Typen und Beschriftungen für Sex-Einträge. Bewusst frei von Server-Importen,
// damit Formular (Client) und Liste/Kalender (Server) dieselben Labels nutzen.

export type SexType = "intercourse" | "manual" | "toy";

export type SexEntry = {
  id: string;
  occurredOn: string; // "YYYY-MM-DD"
  occurredTime: string; // "HH:MM"
  type: SexType;
};

export const SEX_TYPES: {
  value: SexType;
  label: string;
  badgeClass: string;
  dotClass: string;
}[] = [
  {
    value: "intercourse",
    label: "GV",
    badgeClass: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
    dotClass: "bg-violet-600 dark:bg-violet-300",
  },
  {
    value: "manual",
    label: "Handarbeit",
    badgeClass: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    dotClass: "bg-sky-600 dark:bg-sky-300",
  },
  {
    value: "toy",
    label: "Vibrator",
    badgeClass: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
    dotClass: "bg-fuchsia-600 dark:bg-fuchsia-300",
  },
];

export const SEX_TYPE_VALUES = SEX_TYPES.map((t) => t.value) as [SexType, ...SexType[]];

export function sexTypeMeta(type: SexType) {
  return SEX_TYPES.find((t) => t.value === type) ?? SEX_TYPES[0];
}

export function isSexType(v: unknown): v is SexType {
  return SEX_TYPES.some((t) => t.value === v);
}

// Aktuelle Uhrzeit als "HH:MM" – auf dem Server aufrufen (Zeitzone = APP_TIMEZONE),
// damit Server- und Client-Render dieselbe Vorbelegung zeigen.
export function currentTimeHHMM(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}
