"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users, cycleSettings } from "@/db/schema";
import { createSession, deleteSession } from "@/lib/session";
import { isRegistrationEnabled } from "@/lib/app-settings";
import { signupSchema, loginSchema } from "@/lib/validation";
import {
  getClientIp,
  isRateLimited,
  registerFailedAttempt,
  resetAttempts,
} from "@/lib/rate-limit";

const TOO_MANY =
  "Zu viele Versuche. Bitte in einigen Minuten erneut versuchen.";

export type AuthState =
  | {
      error?: string;
      fieldErrors?: Record<string, string[]>;
    }
  | undefined;

// Gültiger Bcrypt-Hash für den Dummy-Vergleich bei unbekannter E-Mail.
const DUMMY_HASH = bcrypt.hashSync("dummy-password-placeholder", 12);

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = signupSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    tracksCycle: formData.get("tracksCycle") !== "no",
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { displayName, email, password, tracksCycle } = parsed.data;

  // Der allererste Nutzer einer Instanz wird Admin und darf sich immer anlegen.
  // Danach gilt der vom Admin schaltbare Registrierungs-Schalter.
  const anyUser = await db.select({ id: users.id }).from(users).limit(1);
  const isFirstUser = anyUser.length === 0;
  if (!isFirstUser && !(await isRegistrationEnabled())) {
    return { error: "Die Registrierung ist derzeit deaktiviert." };
  }

  // Registrierung pro IP begrenzen (Schutz vor Massen-Anlage)
  const ipKey = [`signup:ip:${await getClientIp()}`];
  if (await isRateLimited(ipKey)) {
    return { error: TOO_MANY };
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing[0]) {
    return { error: "Diese E-Mail ist bereits registriert." };
  }

  await registerFailedAttempt(ipKey);

  const passwordHash = await bcrypt.hash(password, 12);

  const inserted = await db
    .insert(users)
    .values({ email, passwordHash, displayName, tracksCycle, isAdmin: isFirstUser })
    .returning({ id: users.id });

  const userId = inserted[0].id;

  // Standard-Zykluseinstellungen nur für Personen mit eigenem Zyklus anlegen
  if (tracksCycle) {
    await db.insert(cycleSettings).values({ ownerId: userId }).onConflictDoNothing();
  }

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

  // Limit pro IP und pro E-Mail (fängt auch IP-Rotation gegen ein Konto ab)
  const keys = [
    `login:ip:${await getClientIp()}`,
    `login:email:${parsed.data.email}`,
  ];
  if (await isRateLimited(keys)) {
    return { error: TOO_MANY };
  }

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);

  const user = rows[0];
  // Auch bei unbekannter E-Mail einen bcrypt-Vergleich ausführen, damit die
  // Antwortzeit keine Rückschlüsse erlaubt (User-Enumeration verhindern).
  const ok = await bcrypt.compare(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !ok) {
    await registerFailedAttempt(keys);
    return { error: "E-Mail oder Passwort ist falsch." };
  }

  await resetAttempts(keys);
  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
