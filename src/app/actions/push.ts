"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { requireUser } from "@/lib/dal";
import { sendPushToUser } from "@/lib/push";

export type SerializedSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function subscribeUser(
  sub: SerializedSubscription,
  userAgent?: string,
): Promise<{ success: boolean }> {
  const user = await requireUser();

  await db
    .insert(pushSubscriptions)
    .values({
      userId: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      userAgent: userAgent ?? null,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId: user.id, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    });

  return { success: true };
}

export async function unsubscribeUser(endpoint: string): Promise<{ success: boolean }> {
  const user = await requireUser();
  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.endpoint, endpoint),
        eq(pushSubscriptions.userId, user.id),
      ),
    );
  return { success: true };
}

export async function sendTestNotification(): Promise<{ sent: number; removed: number }> {
  const user = await requireUser();
  return sendPushToUser(user.id, {
    title: "Testbenachrichtigung",
    body: "Push funktioniert! 🎉",
    url: "/dashboard",
    tag: "test",
  });
}
