import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings } from "@/db/schema";

const GLOBAL = "global";

// Liefert, ob sich neue Nutzer registrieren dürfen. Fehlt die Zeile (z. B. ganz
// frische DB vor der ersten Registrierung), gilt der Default "erlaubt".
export async function isRegistrationEnabled(): Promise<boolean> {
  const rows = await db
    .select({ enabled: appSettings.registrationEnabled })
    .from(appSettings)
    .where(eq(appSettings.id, GLOBAL))
    .limit(1);
  return rows[0]?.enabled ?? true;
}

export async function setRegistrationEnabled(enabled: boolean): Promise<void> {
  await db
    .insert(appSettings)
    .values({ id: GLOBAL, registrationEnabled: enabled })
    .onConflictDoUpdate({
      target: appSettings.id,
      set: { registrationEnabled: enabled },
    });
}
