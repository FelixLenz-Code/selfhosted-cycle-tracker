// Notification-Worker: verarbeitet fällige scheduled_notifications UND
// Medikamenten-Erinnerungen und versendet sie via Web Push.
// Separater Prozess (npm run worker).

// Zeitzone für Wall-Clock-Erinnerungen (Medikamentenzeiten)
if (process.env.APP_TIMEZONE) process.env.TZ = process.env.APP_TIMEZONE;

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

const pad = (n) => String(n).padStart(2, "0");
const DAY_MS = 864e5;

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

// --- Geplante Benachrichtigungen ---
async function processScheduled() {
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
        set status = ${sent > 0 ? "sent" : "failed"}, sent_at = now() where id = ${n.id}`;
      console.log(`[worker] scheduled ${n.id} -> ${sent} Gerät(e)`);
    } catch (err) {
      console.error("[worker] scheduled fehlgeschlagen", n.id, err);
      await sql`update scheduled_notifications set status = 'failed' where id = ${n.id}`;
    }
  }
}

// --- Medikamenten-Erinnerungen ---
async function currentCycleDay(ownerId, todayStr) {
  const rows = await sql`
    select start_date::text as start_date from period_entries
    where owner_id = ${ownerId} order by start_date desc limit 1`;
  if (rows.length === 0) return null;
  const last = rows[0].start_date;
  const diff = Math.round(
    (Date.parse(`${todayStr}T00:00:00Z`) - Date.parse(`${last}T00:00:00Z`)) / DAY_MS,
  );
  return diff + 1;
}

async function processMedications() {
  const now = new Date();
  const hhmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  const meds = await sql`
    select id, owner_id, name, dosage, schedule_type, times, cycle_day_from, cycle_day_to
    from medications where active = true`;

  for (const m of meds) {
    const times = Array.isArray(m.times) ? m.times : [];
    if (!times.includes(hhmm)) continue;

    if (m.schedule_type === "cycle_relative") {
      const cd = await currentCycleDay(m.owner_id, todayStr);
      if (cd === null) continue;
      if (m.cycle_day_from !== null && cd < m.cycle_day_from) continue;
      if (m.cycle_day_to !== null && cd > m.cycle_day_to) continue;
    }

    const dueAt = new Date(`${todayStr}T${hhmm}:00`);
    const existing = await sql`
      select 1 from medication_logs where medication_id = ${m.id} and due_at = ${dueAt} limit 1`;
    if (existing.length > 0) continue; // schon erinnert (Dedup)

    await sql`insert into medication_logs (medication_id, due_at) values (${m.id}, ${dueAt})`;
    const payload = {
      title: `Medikament: ${m.name}`,
      body: m.dosage ? `${m.name} – ${m.dosage}` : `Zeit für ${m.name}`,
      url: "/medications",
      tag: `med-${m.id}-${todayStr}-${hhmm}`,
    };
    const { sent } = await sendToUser(m.owner_id, payload);
    console.log(`[worker] medication ${m.name} @ ${hhmm} -> ${sent} Gerät(e)`);
  }
}

async function tick() {
  try {
    await processScheduled();
    await processMedications();
  } catch (err) {
    console.error("[worker] tick error", err);
  }
}

console.log("[worker] gestartet – prüfe jede Minute fällige Benachrichtigungen");
tick();
cron.schedule("* * * * *", tick);

async function shutdown() {
  console.log("[worker] beende …");
  await sql.end();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
