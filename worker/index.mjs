// Notification-Worker: prüft periodisch fällige Einträge in scheduled_notifications
// und versendet sie via Web Push. Separater Prozess (npm run worker).
import postgres from "postgres";
import webpush from "web-push";
import cron from "node-cron";

const { DATABASE_URL, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

if (!DATABASE_URL) throw new Error("DATABASE_URL fehlt");
if (!NEXT_PUBLIC_VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  throw new Error("VAPID-Keys fehlen");
}

webpush.setVapidDetails(VAPID_SUBJECT, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
const sql = postgres(DATABASE_URL);

async function sendToUser(userId, payload) {
  const subs = await sql`
    select id, endpoint, p256dh, auth from push_subscriptions where user_id = ${userId}`;
  if (subs.length === 0) return { sent: 0 };
  const body = JSON.stringify(payload);
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        body,
      );
      sent++;
    } catch (err) {
      const status = err?.statusCode;
      if (status === 404 || status === 410) {
        await sql`delete from push_subscriptions where id = ${s.id}`;
      } else {
        console.error("[worker] push error", status, err?.body);
      }
    }
  }
  return { sent };
}

async function processDue() {
  const due = await sql`
    select id, user_id, payload_json
    from scheduled_notifications
    where status = 'pending' and scheduled_for <= now()
    order by scheduled_for asc
    limit 50`;

  for (const n of due) {
    const payload = n.payload_json ?? { title: "Erinnerung", body: "" };
    try {
      const { sent } = await sendToUser(n.user_id, payload);
      await sql`update scheduled_notifications
        set status = ${sent > 0 ? "sent" : "failed"}, sent_at = now()
        where id = ${n.id}`;
      console.log(`[worker] notification ${n.id} -> ${sent} Gerät(e)`);
    } catch (err) {
      console.error("[worker] verarbeitung fehlgeschlagen", n.id, err);
      await sql`update scheduled_notifications set status = 'failed' where id = ${n.id}`;
    }
  }
}

console.log("[worker] gestartet – prüfe jede Minute fällige Benachrichtigungen");
// Sofort einmal laufen, dann jede Minute
processDue().catch((e) => console.error("[worker]", e));
cron.schedule("* * * * *", () => {
  processDue().catch((e) => console.error("[worker]", e));
});

async function shutdown() {
  console.log("[worker] beende …");
  await sql.end();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
