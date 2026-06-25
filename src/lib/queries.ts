import "server-only";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { periodEntries, cycleSettings } from "@/db/schema";
import type { PeriodEntryLite, CycleSettingsLite } from "./cycle";

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
    })
    .from(cycleSettings)
    .where(eq(cycleSettings.ownerId, ownerId))
    .limit(1);

  return rows[0] ?? { avgCycleLengthOverride: null, lutealPhaseDays: 14 };
}
