import "server-only";
import webpush from "web-push";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";

let configured = false;

function ensureConfigured(): void {
  if (configured) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
  if (!pub || !priv) {
    throw new Error("VAPID-Keys fehlen (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).");
  }
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
};

// Sendet an alle Geräte eines Users; entfernt abgelaufene Subscriptions (404/410).
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; removed: number }> {
  ensureConfigured();

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  const body = JSON.stringify(payload);
  let sent = 0;
  let removed = 0;

  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        body,
      );
      sent++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, s.id));
        removed++;
      } else {
        console.error("Push-Fehler", status, (err as { body?: string }).body);
      }
    }
  }

  return { sent, removed };
}
