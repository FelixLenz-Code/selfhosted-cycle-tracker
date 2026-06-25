import "server-only";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { medications } from "@/db/schema";

export type Medication = {
  id: string;
  name: string;
  dosage: string | null;
  active: boolean;
  scheduleType: "fixed_time" | "cycle_relative";
  times: string[];
  weekdays: number[]; // ISO 1=Mo..7=So; leer = täglich
  cycleDayFrom: number | null;
  cycleDayTo: number | null;
};

export async function getMedications(ownerId: string): Promise<Medication[]> {
  const rows = await db
    .select({
      id: medications.id,
      name: medications.name,
      dosage: medications.dosage,
      active: medications.active,
      scheduleType: medications.scheduleType,
      times: medications.times,
      weekdays: medications.weekdays,
      cycleDayFrom: medications.cycleDayFrom,
      cycleDayTo: medications.cycleDayTo,
    })
    .from(medications)
    .where(eq(medications.ownerId, ownerId))
    .orderBy(desc(medications.createdAt));
  return rows;
}
