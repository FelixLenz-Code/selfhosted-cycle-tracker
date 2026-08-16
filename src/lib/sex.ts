// Typen und Beschriftungen für Sex-Einträge. Bewusst frei von Server-Importen,
// damit Formular (Client) und Liste/Kalender (Server) dieselben Labels nutzen.

export type SexType = "intercourse" | "manual" | "toy";
export type OrgasmResult = "none" | "yes" | "ruined";

// Eine beteiligte Person eines Eintrags. Art und Orgasmus gelten nur für sie.
export type SexParticipant = {
  userId: string;
  name: string;
  type: SexType;
  orgasm: OrgasmResult;
};

export type SexEntry = {
  id: string;
  occurredOn: string; // "YYYY-MM-DD"
  occurredTime: string; // "HH:MM"
  participants: SexParticipant[];
};

// Auswählbare Person im Formular (Owner + verknüpfte Partner).
export type SexPerson = { id: string; name: string };

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

// Orgasmus je Person. `symbol` ist die kompakte Zweitkennzeichnung in Listen.
export const ORGASM_RESULTS: {
  value: OrgasmResult;
  label: string;
  short: string;
  symbol: string;
  badgeClass: string;
}[] = [
  {
    value: "none",
    label: "Kein Orgasmus",
    short: "Kein O.",
    symbol: "–",
    badgeClass: "bg-black/5 text-black/50 dark:bg-white/10 dark:text-white/50",
  },
  {
    value: "yes",
    label: "Orgasmus",
    short: "Orgasmus",
    symbol: "✓",
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  {
    value: "ruined",
    label: "Ruinierter Orgasmus",
    short: "Ruiniert",
    symbol: "≈",
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
];

export const ORGASM_VALUES = ORGASM_RESULTS.map((o) => o.value) as [
  OrgasmResult,
  ...OrgasmResult[],
];

export function sexTypeMeta(type: SexType) {
  return SEX_TYPES.find((t) => t.value === type) ?? SEX_TYPES[0];
}

export function orgasmMeta(orgasm: OrgasmResult) {
  return ORGASM_RESULTS.find((o) => o.value === orgasm) ?? ORGASM_RESULTS[0];
}

export function isSexType(v: unknown): v is SexType {
  return SEX_TYPES.some((t) => t.value === v);
}

// Vorkommende Arten eines Eintrags, ohne Dubletten und in SEX_TYPES-Reihenfolge –
// für die Punkte im Kalender.
export function entrySexTypes(entry: SexEntry): SexType[] {
  return SEX_TYPES.map((t) => t.value).filter((t) =>
    entry.participants.some((p) => p.type === t),
  );
}

// Aktuelle Uhrzeit als "HH:MM" – auf dem Server aufrufen (Zeitzone = APP_TIMEZONE),
// damit Server- und Client-Render dieselbe Vorbelegung zeigen.
export function currentTimeHHMM(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}
