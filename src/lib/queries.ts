import "server-only";
import { and, eq, desc, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { periodEntries, cycleSettings, sexEntries } from "@/db/schema";
import type { PeriodEntryLite, CycleSettingsLite, CycleMode } from "./cycle";
import type { SexEntry, SexType } from "./sex";

export type CycleSettingsForm = {
  avgCycleLengthOverride: number | null;
  mode: CycleMode;
  fertileStartDay: number;
  fertileEndDay: number;
  windowStartDay: number;
  windowEndDay: number | null;
  notifyTime: string; // "HH:MM"
  notifyAudience: "owner" | "partner" | "both";
};

export async function getPeriodEntries(ownerId: string): Promise<PeriodEntryLite[]> {
  const rows = await db
    .select({
      id: periodEntries.id,
      startDate: periodEntries.startDate,
      endDate: periodEntries.endDate,
    })
    .from(periodEntries)
    .where(eq(periodEntries.ownerId, ownerId))
    .orderBy(desc(periodEntries.startDate));
  return rows;
}

export async function getCycleSettings(ownerId: string): Promise<CycleSettingsLite> {
  const rows = await db
    .select({
      avgCycleLengthOverride: cycleSettings.avgCycleLengthOverride,
      mode: cycleSettings.mode,
      fertileStartDay: cycleSettings.fertileStartDay,
      fertileEndDay: cycleSettings.fertileEndDay,
      windowStartDay: cycleSettings.windowStartDay,
      windowEndDay: cycleSettings.windowEndDay,
    })
    .from(cycleSettings)
    .where(eq(cycleSettings.ownerId, ownerId))
    .limit(1);

  return (
    rows[0] ?? {
      avgCycleLengthOverride: null,
      mode: "ttc",
      fertileStartDay: 12,
      fertileEndDay: 16,
      windowStartDay: 28,
      windowEndDay: null,
    }
  );
}

export async function getCycleSettingsForm(ownerId: string): Promise<CycleSettingsForm> {
  const rows = await db
    .select({
      avgCycleLengthOverride: cycleSettings.avgCycleLengthOverride,
      mode: cycleSettings.mode,
      fertileStartDay: cycleSettings.fertileStartDay,
      fertileEndDay: cycleSettings.fertileEndDay,
      windowStartDay: cycleSettings.windowStartDay,
      windowEndDay: cycleSettings.windowEndDay,
      notifyTime: cycleSettings.notifyTime,
      notifyAudience: cycleSettings.notifyAudience,
    })
    .from(cycleSettings)
    .where(eq(cycleSettings.ownerId, ownerId))
    .limit(1);

  const r = rows[0];
  if (!r) {
    return {
      avgCycleLengthOverride: null,
      mode: "ttc",
      fertileStartDay: 12,
      fertileEndDay: 16,
      windowStartDay: 28,
      windowEndDay: null,
      notifyTime: "09:00",
      notifyAudience: "owner",
    };
  }
  return { ...r, notifyTime: r.notifyTime.slice(0, 5) };
}

// --- Sex-Einträge ---
const sexColumns = {
  id: sexEntries.id,
  occurredOn: sexEntries.occurredOn,
  occurredTime: sexEntries.occurredTime,
  type: sexEntries.type,
};

// Postgres liefert `time` als "HH:MM:SS" – für Anzeige und <input type="time">
// wird auf "HH:MM" gekürzt.
function toSexEntry(r: {
  id: string;
  occurredOn: string;
  occurredTime: string;
  type: SexType;
}): SexEntry {
  return { ...r, occurredTime: r.occurredTime.slice(0, 5) };
}

export async function getSexEntries(ownerId: string): Promise<SexEntry[]> {
  const rows = await db
    .select(sexColumns)
    .from(sexEntries)
    .where(eq(sexEntries.ownerId, ownerId))
    .orderBy(desc(sexEntries.occurredOn), desc(sexEntries.occurredTime));
  return rows.map(toSexEntry);
}

// Einträge eines Zeitraums (für die Kalender-Markierung), aufsteigend nach Zeit.
export async function getSexEntriesBetween(
  ownerId: string,
  fromIso: string,
  toIso: string,
): Promise<SexEntry[]> {
  const rows = await db
    .select(sexColumns)
    .from(sexEntries)
    .where(
      and(
        eq(sexEntries.ownerId, ownerId),
        gte(sexEntries.occurredOn, fromIso),
        lte(sexEntries.occurredOn, toIso),
      ),
    )
    .orderBy(sexEntries.occurredOn, sexEntries.occurredTime);
  return rows.map(toSexEntry);
}
