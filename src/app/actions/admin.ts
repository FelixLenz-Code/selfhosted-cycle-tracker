"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { requireAdmin } from "@/lib/dal";
import { setRegistrationEnabled } from "@/lib/app-settings";
import { isUuid } from "@/lib/ids";
import { adminEditUserSchema, adminPasswordSchema } from "@/lib/validation";

export type AdminActionState = { error?: string; ok?: string } | undefined;

// Wie viele Admins gibt es aktuell? (zum Schutz des letzten Admins)
async function adminIds(): Promise<string[]> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.isAdmin, true));
  return rows.map((r) => r.id);
}

// Registrierung global ein-/ausschalten.
export async function setRegistration(formData: FormData): Promise<void> {
  await requireAdmin();
  const enabled = String(formData.get("enabled") ?? "") === "true";
  await setRegistrationEnabled(enabled);
  revalidatePath("/admin");
}

// Admin-Recht geben oder entziehen. Der letzte Admin kann sich nicht degradieren.
export async function setUserAdmin(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const makeAdmin = String(formData.get("makeAdmin") ?? "") === "true";
  if (!isUuid(id)) return;

  if (!makeAdmin) {
    const admins = await adminIds();
    if (admins.length <= 1 && admins.includes(id)) return; // letzten Admin behalten
  }

  await db.update(users).set({ isAdmin: makeAdmin }).where(eq(users.id, id));
  revalidatePath("/admin");
}

// Nutzer löschen (cascade entfernt dessen Zyklus-/Perioden-/Medikamentendaten).
// Schutz: nicht sich selbst, nicht den letzten Admin.
export async function deleteUser(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id) || id === admin.id) return;

  const target = await db
    .select({ isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (!target[0]) return;
  if (target[0].isAdmin) {
    const admins = await adminIds();
    if (admins.length <= 1) return;
  }

  await db.delete(users).where(eq(users.id, id));
  revalidatePath("/admin");
}

// Neues Passwort setzen und bestehende Sitzungen des Nutzers beenden.
export async function resetUserPassword(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { error: "Ungültiger Nutzer." };

  const parsed = adminPasswordSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültiges Passwort." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await db.update(users).set({ passwordHash }).where(eq(users.id, id));

  // Fremde Sitzungen invalidieren; die eigene Sitzung des Admins bleibt bestehen.
  if (id !== admin.id) {
    await db.delete(sessions).where(eq(sessions.userId, id));
  }

  revalidatePath("/admin");
  return { ok: "Passwort aktualisiert." };
}

// Name und E-Mail eines Nutzers bearbeiten (E-Mail muss eindeutig bleiben).
export async function editUser(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { error: "Ungültiger Nutzer." };

  const parsed = adminEditUserSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  const clash = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);
  if (clash[0] && clash[0].id !== id) {
    return { error: "Diese E-Mail ist bereits vergeben." };
  }

  await db
    .update(users)
    .set({ displayName: parsed.data.displayName, email: parsed.data.email })
    .where(eq(users.id, id));

  revalidatePath("/admin");
  return { ok: "Gespeichert." };
}
