import { requireAdmin } from "@/lib/dal";
import { exportBackup } from "@/lib/backup";

// Vollständiges Instanz-Backup als JSON-Download (nur Admins).
export async function GET() {
  await requireAdmin();

  const backup = await exportBackup();
  const json = JSON.stringify(backup, null, 2);
  const date = new Date().toISOString().slice(0, 10);

  return new Response(json, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="zyklus-backup-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
