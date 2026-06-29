import "server-only";
import { getTableColumns, type Table } from "drizzle-orm";
import { db } from "@/db";
import {
  users,
  appSettings,
  rateLimitHits,
  sessions,
  partnerLinks,
  periodEntries,
  cycleSettings,
  medications,
  medicationLogs,
  pushSubscriptions,
  scheduledNotifications,
} from "@/db/schema";

export const BACKUP_FORMAT = "zyklus-backup";
export const BACKUP_VERSION = 1;

// Alle Tabellen in Abhängigkeitsreihenfolge: Eltern (referenzierte) zuerst.
// Für den Export ist die Reihenfolge egal; beim Import wird in dieser Reihenfolge
// eingefügt und in umgekehrter Reihenfolge geleert, damit Fremdschlüssel passen.
const BACKUP_TABLES: { name: string; table: Table }[] = [
  { name: "users", table: users },
  { name: "appSettings", table: appSettings },
  { name: "rateLimitHits", table: rateLimitHits },
  { name: "sessions", table: sessions },
  { name: "partnerLinks", table: partnerLinks },
  { name: "periodEntries", table: periodEntries },
  { name: "cycleSettings", table: cycleSettings },
  { name: "medications", table: medications },
  { name: "medicationLogs", table: medicationLogs },
  { name: "pushSubscriptions", table: pushSubscriptions },
  { name: "scheduledNotifications", table: scheduledNotifications },
];

export type BackupFile = {
  format: typeof BACKUP_FORMAT;
  version: number;
  createdAt: string;
  tables: Record<string, Record<string, unknown>[]>;
};

// Liest die komplette Instanz aus und liefert ein serialisierbares Backup-Objekt.
// Datums-/Zeitstempelwerte werden von JSON.stringify zu ISO-Strings.
export async function exportBackup(): Promise<BackupFile> {
  const tables: Record<string, Record<string, unknown>[]> = {};
  for (const { name, table } of BACKUP_TABLES) {
    tables[name] = (await db.select().from(table)) as Record<string, unknown>[];
  }
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    tables,
  };
}

// Reduziert eine Zeile auf die bekannten Spalten der Tabelle und belebt
// Zeitstempel-Spalten (dataType "date") wieder zu Date-Objekten, die Drizzle
// beim Insert erwartet. Unbekannte Felder werden verworfen, fehlende Spalten
// erhalten ihren DB-Default.
function prepareRow(
  table: Table,
  row: Record<string, unknown>,
): Record<string, unknown> {
  const cols = getTableColumns(table);
  const out: Record<string, unknown> = {};
  for (const [key, col] of Object.entries(cols)) {
    if (!(key in row)) continue;
    const value = row[key];
    out[key] = value != null && col.dataType === "date" ? new Date(value as string) : value;
  }
  return out;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// Ersetzt den gesamten Datenbestand durch das übergebene Backup.
// Destruktiv: alle vorhandenen Daten werden in einer Transaktion gelöscht und
// durch die Backup-Daten ersetzt. Schlägt etwas fehl, wird komplett zurückgerollt.
export async function importBackup(
  data: unknown,
): Promise<{ tables: Record<string, number> }> {
  if (!isPlainObject(data) || data.format !== BACKUP_FORMAT) {
    throw new Error("Unbekanntes Dateiformat – kein gültiges Zyklus-Backup.");
  }
  if (data.version !== BACKUP_VERSION) {
    throw new Error(
      `Backup-Version ${String(data.version)} wird nicht unterstützt (erwartet ${BACKUP_VERSION}).`,
    );
  }
  if (!isPlainObject(data.tables)) {
    throw new Error("Backup enthält keine Tabellen.");
  }
  const tables = data.tables;

  // Zeilen vorab aufbereiten (validiert nebenbei die Struktur).
  const prepared: { name: string; table: Table; rows: Record<string, unknown>[] }[] =
    BACKUP_TABLES.map(({ name, table }) => {
      const raw = tables[name] ?? [];
      if (!Array.isArray(raw)) {
        throw new Error(`Tabelle "${name}" ist im Backup kein Array.`);
      }
      const rows = raw.map((r) => {
        if (!isPlainObject(r)) {
          throw new Error(`Tabelle "${name}" enthält einen ungültigen Datensatz.`);
        }
        return prepareRow(table, r);
      });
      return { name, table, rows };
    });

  const counts: Record<string, number> = {};

  await db.transaction(async (tx) => {
    // In umgekehrter Reihenfolge leeren (Kinder vor Eltern).
    for (let i = prepared.length - 1; i >= 0; i--) {
      await tx.delete(prepared[i].table);
    }
    // In Abhängigkeitsreihenfolge einfügen, gechunkt gegen Parameter-Limits.
    for (const { name, table, rows } of prepared) {
      for (let i = 0; i < rows.length; i += 500) {
        await tx.insert(table).values(rows.slice(i, i + 500));
      }
      counts[name] = rows.length;
    }
  });

  return { tables: counts };
}
