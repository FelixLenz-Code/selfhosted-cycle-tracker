import "server-only";
import { and, eq, desc, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  periodEntries,
  cycleSettings,
  sexEntries,
  sexParticipants,
  users,
} from "@/db/schema";
import type { PeriodEntryLite, CycleSettingsLite, CycleMode } from "./cycle";
import type { SexEntry, SexType, OrgasmResult } from "./sex";

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
// Ein Eintrag hat je beteiligter Person eine Zeile in sex_participants; der
// Left-Join liefert deshalb mehrere Zeilen pro Eintrag, die hier wieder zu
// einem Objekt zusammengefasst werden.
const sexColumns = {
  id: sexEntries.id,
  occurredOn: sexEntries.occurredOn,
  occurredTime: sexEntries.occurredTime,
  userId: sexParticipants.userId,
  name: users.displayName,
  type: sexParticipants.type,
  orgasm: sexParticipants.orgasm,
};

type SexRow = {
  id: string;
  occurredOn: string;
  occurredTime: string;
  userId: string | null;
  name: string | null;
  type: SexType | null;
  orgasm: OrgasmResult | null;
};

// Postgres liefert `time` als "HH:MM:SS" – für Anzeige und <input type="time">
// wird auf "HH:MM" gekürzt.
function groupSexRows(rows: SexRow[]): SexEntry[] {
  const entries: SexEntry[] = [];
  const byId = new Map<string, SexEntry>();
  for (const r of rows) {
    let entry = byId.get(r.id);
    if (!entry) {
      entry = {
        id: r.id,
        occurredOn: r.occurredOn,
        occurredTime: r.occurredTime.slice(0, 5),
        participants: [],
      };
      byId.set(r.id, entry);
      entries.push(entry);
    }
    if (r.userId && r.type) {
      entry.participants.push({
        userId: r.userId,
        name: r.name ?? "Unbekannt",
        type: r.type,
        orgasm: r.orgasm ?? "none",
      });
    }
  }
  return entries;
}

export async function getSexEntries(ownerId: string): Promise<SexEntry[]> {
  const rows = await db
    .select(sexColumns)
    .from(sexEntries)
    .leftJoin(sexParticipants, eq(sexParticipants.entryId, sexEntries.id))
    .leftJoin(users, eq(users.id, sexParticipants.userId))
    .where(eq(sexEntries.ownerId, ownerId))
    .orderBy(
      desc(sexEntries.occurredOn),
      desc(sexEntries.occurredTime),
      sexEntries.id,
      users.displayName,
    );
  return groupSexRows(rows);
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
    .leftJoin(sexParticipants, eq(sexParticipants.entryId, sexEntries.id))
    .leftJoin(users, eq(users.id, sexParticipants.userId))
    .where(
      and(
        eq(sexEntries.ownerId, ownerId),
        gte(sexEntries.occurredOn, fromIso),
        lte(sexEntries.occurredOn, toIso),
      ),
    )
    .orderBy(
      sexEntries.occurredOn,
      sexEntries.occurredTime,
      sexEntries.id,
      users.displayName,
    );
  return groupSexRows(rows);
}
