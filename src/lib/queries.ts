import "server-only";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { periodEntries, cycleSettings } from "@/db/schema";
import type { PeriodEntryLite, CycleSettingsLite, CycleMode } from "./cycle";

export type CycleSettingsForm = {
  avgCycleLengthOverride: number | null;
  lutealPhaseDays: number;
  mode: CycleMode;
  windowStartOffset: number;
  windowEndOffset: number;
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
      lutealPhaseDays: cycleSettings.lutealPhaseDays,
      mode: cycleSettings.mode,
      windowStartOffset: cycleSettings.windowStartOffset,
      windowEndOffset: cycleSettings.windowEndOffset,
    })
    .from(cycleSettings)
    .where(eq(cycleSettings.ownerId, ownerId))
    .limit(1);

  return (
    rows[0] ?? {
      avgCycleLengthOverride: null,
      lutealPhaseDays: 14,
      mode: "ttc",
      windowStartOffset: -4,
      windowEndOffset: 1,
    }
  );
}

export async function getCycleSettingsForm(ownerId: string): Promise<CycleSettingsForm> {
  const rows = await db
    .select({
      avgCycleLengthOverride: cycleSettings.avgCycleLengthOverride,
      lutealPhaseDays: cycleSettings.lutealPhaseDays,
      mode: cycleSettings.mode,
      windowStartOffset: cycleSettings.windowStartOffset,
      windowEndOffset: cycleSettings.windowEndOffset,
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
      lutealPhaseDays: 14,
      mode: "ttc",
      windowStartOffset: -4,
      windowEndOffset: 1,
      notifyTime: "09:00",
      notifyAudience: "owner",
    };
  }
  return { ...r, notifyTime: r.notifyTime.slice(0, 5) };
}
