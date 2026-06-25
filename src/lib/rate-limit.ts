import "server-only";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { rateLimitHits } from "@/db/schema";

const WINDOW_MS = 15 * 60 * 1000; // 15 Minuten
const LIMIT = 10; // erlaubte Versuche pro Fenster und Schlüssel

// Echte Client-IP hinter einem Reverse Proxy. Der Proxy setzt X-Forwarded-For;
// der erste Eintrag ist der ursprüngliche Client.
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip")?.trim() || "unknown";
}

// true, wenn einer der Schlüssel im aktuellen Fenster über dem Limit liegt.
export async function isRateLimited(keys: string[]): Promise<boolean> {
  const now = Date.now();
  for (const key of keys) {
    const rows = await db
      .select()
      .from(rateLimitHits)
      .where(eq(rateLimitHits.key, key))
      .limit(1);
    const r = rows[0];
    if (r && now - r.windowStart.getTime() < WINDOW_MS && r.count >= LIMIT) {
      return true;
    }
  }
  return false;
}

// Zählt einen Versuch für jeden Schlüssel (mit Fenster-Reset bei Ablauf).
export async function registerFailedAttempt(keys: string[]): Promise<void> {
  const now = new Date();
  for (const key of keys) {
    const rows = await db
      .select()
      .from(rateLimitHits)
      .where(eq(rateLimitHits.key, key))
      .limit(1);
    const r = rows[0];
    if (!r || now.getTime() - r.windowStart.getTime() >= WINDOW_MS) {
      await db
        .insert(rateLimitHits)
        .values({ key, count: 1, windowStart: now })
        .onConflictDoUpdate({
          target: rateLimitHits.key,
          set: { count: 1, windowStart: now },
        });
    } else {
      await db
        .update(rateLimitHits)
        .set({ count: r.count + 1 })
        .where(eq(rateLimitHits.key, key));
    }
  }
}

// Setzt Zähler zurück (z. B. nach erfolgreichem Login).
export async function resetAttempts(keys: string[]): Promise<void> {
  for (const key of keys) {
    await db.delete(rateLimitHits).where(eq(rateLimitHits.key, key));
  }
}
