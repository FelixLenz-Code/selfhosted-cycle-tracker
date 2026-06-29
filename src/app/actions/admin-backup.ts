"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { importBackup } from "@/lib/backup";

export type RestoreState = { error?: string; ok?: string } | undefined;

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

// Spielt ein hochgeladenes Instanz-Backup ein und ersetzt damit den gesamten
// Datenbestand. Destruktiv – siehe importBackup.
export async function restoreBackup(
  _prev: RestoreState,
  formData: FormData,
): Promise<RestoreState> {
  await requireAdmin();

  const file = formData.get("backup");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Bitte eine Backup-Datei auswählen." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "Datei ist zu groß (max. 50 MB)." };
  }

  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    return { error: "Datei ist kein gültiges JSON." };
  }

  try {
    const { tables } = await importBackup(data);
    const total = Object.values(tables).reduce((sum, n) => sum + n, 0);
    revalidatePath("/admin");
    return {
      ok: `Wiederhergestellt: ${total} Datensätze. Deine Sitzung wurde ersetzt – bitte neu anmelden.`,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Wiederherstellung fehlgeschlagen.",
    };
  }
}
