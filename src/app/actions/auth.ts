"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users, cycleSettings } from "@/db/schema";
import { createSession, deleteSession } from "@/lib/session";
import { signupSchema, loginSchema } from "@/lib/validation";

export type AuthState =
  | {
      error?: string;
      fieldErrors?: Record<string, string[]>;
    }
  | undefined;

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = signupSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { displayName, email, password } = parsed.data;

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing[0]) {
    return { error: "Diese E-Mail ist bereits registriert." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const inserted = await db
    .insert(users)
    .values({ email, passwordHash, displayName })
    .returning({ id: users.id });

  const userId = inserted[0].id;

  // Standard-Zykluseinstellungen anlegen
  await db.insert(cycleSettings).values({ ownerId: userId }).onConflictDoNothing();

  await createSession(userId);
  redirect("/dashboard");
}

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Ungültige Eingabe." };
  }

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);

  const user = rows[0];
  const ok = user
    ? await bcrypt.compare(parsed.data.password, user.passwordHash)
    : false;

  if (!user || !ok) {
    return { error: "E-Mail oder Passwort ist falsch." };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
