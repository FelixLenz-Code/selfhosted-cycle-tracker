// Notification-Worker: verarbeitet fällige scheduled_notifications,
// Medikamenten-Erinnerungen und die Fenster-Hinweise (fruchtbare Zeit /
// Spaß-Zeit) und versendet sie via Web Push.
// Separater Prozess (npm run worker).

// Zeitzone für Wall-Clock-Erinnerungen (Medikamenten- und Fensterzeiten)
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
const addDays = (iso, n) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
// a - b in ganzen Tagen (reine Kalenderdaten, UTC-verankert)
const diffDays = (aIso, bIso) =>
  Math.round((Date.parse(`${aIso}T00:00:00Z`) - Date.parse(`${bIso}T00:00:00Z`)) / DAY_MS);
// Lokales Kalenderdatum (TZ = APP_TIMEZONE), nicht UTC.
const localDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const minutesOfDay = (d) => d.getHours() * 60 + d.getMinutes();
// "09:00" / "09:00:00" -> Minuten seit Mitternacht; null bei Unsinn
function parseHhmm(value) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(value ?? ""));
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}
const formatDe = (iso) => {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
};

// Wenn eine Erinnerung kein Gerät erreicht, wird sie im Nachholfenster jede
// Minute erneut versucht – die Warnung dazu aber nur einmal geloggt.
const warnedNoDevice = new Map(); // Schlüssel -> Zeitpunkt der Warnung

function warnNoDevice(key, message) {
  const cutoff = Date.now() - 7 * DAY_MS;
  for (const [k, t] of warnedNoDevice) if (t < cutoff) warnedNoDevice.delete(k);
  if (warnedNoDevice.has(key)) return;
  warnedNoDevice.set(key, Date.now());
  console.warn(message);
}

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
// Zyklustag an einem bestimmten Kalendertag (Tag 1 = letzter Blutungsbeginn).
async function cycleDayOn(ownerId, dayStr) {
  const rows = await sql`
    select start_date::text as start_date from period_entries
    where owner_id = ${ownerId} and start_date <= ${dayStr}
    order by start_date desc limit 1`;
  if (rows.length === 0) return null;
  return diffDays(dayStr, rows[0].start_date) + 1;
}

// Verpasste Erinnerungen werden bis zu einer Stunde nachgeholt (Worker-Neustart,
// Deploy, langsamer Tick). Was länger her ist, wird nicht mehr zugestellt –
// eine Medikamenten-Erinnerung Stunden später hilft niemandem.
const MED_CATCHUP_MS = 60 * 60 * 1000;

async function processMedications(now) {
  const todayStr = localDate(now);

  const meds = await sql`
    select id, owner_id, name, dosage, schedule_type, times, weekdays, cycle_day_from, cycle_day_to
    from medications where active = true`;

  for (const m of meds) {
    const times = Array.isArray(m.times) ? m.times : [];
    if (times.length === 0) continue;

    // Gestern mitprüfen, damit späte Uhrzeiten auch über Mitternacht hinweg
    // nachgeholt werden können.
    for (const day of [addDays(todayStr, -1), todayStr]) {
      if (m.schedule_type === "fixed_time") {
        // ISO-Wochentag des jeweiligen Tages: 1=Mo .. 7=So
        const isoWeekday = ((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;
        const weekdays = Array.isArray(m.weekdays) ? m.weekdays : [];
        if (weekdays.length > 0 && !weekdays.includes(isoWeekday)) continue;
      }

      for (const t of times) {
        const minutes = parseHhmm(t);
        if (minutes === null) continue;
        const hhmm = `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

        const dueAt = new Date(`${day}T${hhmm}:00`); // lokale Zeit (TZ = APP_TIMEZONE)
        const lateMs = now.getTime() - dueAt.getTime();
        if (lateMs < 0 || lateMs > MED_CATCHUP_MS) continue; // noch nicht fällig / zu alt

        if (m.schedule_type === "cycle_relative") {
          const cd = await cycleDayOn(m.owner_id, day);
          if (cd === null) continue;
          if (m.cycle_day_from !== null && cd < m.cycle_day_from) continue;
          if (m.cycle_day_to !== null && cd > m.cycle_day_to) continue;
        }

        const existing = await sql`
          select 1 from medication_logs where medication_id = ${m.id} and due_at = ${dueAt} limit 1`;
        if (existing.length > 0) continue; // schon erinnert (Dedup)

        const lateMin = Math.round(lateMs / 60000);
        const base = m.dosage ? `${m.name} – ${m.dosage}` : `Zeit für ${m.name}`;
        const payload = {
          title: `Medikament: ${m.name}`,
          body: lateMin >= 2 ? `${base} (fällig war ${hhmm} Uhr)` : base,
          url: "/medications",
          tag: `med-${m.id}-${day}-${hhmm}`,
        };

        const { sent } = await sendToUser(m.owner_id, payload);
        if (sent === 0) {
          // Kein Gerät erreicht: keinen Log-Eintrag schreiben, damit es der
          // nächste Tick im Nachholfenster erneut versucht.
          warnNoDevice(
            `med-${m.id}-${day}-${hhmm}`,
            `[worker] medication ${m.name} @ ${day} ${hhmm}: kein Gerät erreicht – wird bis zu 60 Min. nachgeholt`,
          );
          continue;
        }

        await sql`insert into medication_logs (medication_id, due_at) values (${m.id}, ${dueAt})`;
        console.log(
          `[worker] medication ${m.name} @ ${day} ${hhmm}${
            lateMin >= 2 ? ` (${lateMin} Min. nachgeholt)` : ""
          } -> ${sent} Gerät(e)`,
        );
      }
    }
  }
}

// --- GV-Fenster-Hinweise ---
async function cycleInfo(ownerId, override) {
  const rows = await sql`
    select start_date::text as start_date from period_entries
    where owner_id = ${ownerId} order by start_date desc limit 7`;
  if (rows.length === 0) return null;
  const starts = rows.map((r) => r.start_date); // absteigend
  const diffs = [];
  for (let i = 0; i < starts.length - 1; i++) {
    const d = Math.round(
      (Date.parse(`${starts[i]}T00:00:00Z`) - Date.parse(`${starts[i + 1]}T00:00:00Z`)) / DAY_MS,
    );
    if (d > 0) diffs.push(d);
  }
  let avg;
  if (override && override > 0) avg = override;
  else if (diffs.length) avg = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
  else avg = 28;
  return { lastStart: starts[0], avg };
}

async function processGvWindows(now) {
  const todayStr = localDate(now);
  const nowMinutes = minutesOfDay(now);

  // Ohne gespeicherte Zyklus-Einstellungen gelten dieselben Standardwerte wie
  // im Dashboard (siehe src/lib/queries.ts) – sonst bekäme niemand einen
  // Hinweis, der die Einstellungen nie geöffnet hat.
  const rows = await sql`
    select u.id as owner_id,
           u.display_name,
           coalesce(cs.mode, 'ttc') as mode,
           coalesce(cs.fertile_start_day, 12) as fertile_start_day,
           coalesce(cs.fertile_end_day, 16) as fertile_end_day,
           coalesce(cs.window_start_day, 28) as window_start_day,
           cs.window_end_day,
           coalesce(cs.notify_time, time '09:00')::text as notify_time,
           coalesce(cs.notify_audience, 'owner') as notify_audience,
           cs.avg_cycle_length_override,
           cs.last_gv_notified::text as last_gv_notified
    from users u
    left join cycle_settings cs on cs.owner_id = u.id
    where u.tracks_cycle = true`;

  for (const s of rows) {
    const notifyMinutes = parseHhmm(s.notify_time);
    if (notifyMinutes === null) continue;
    // Vor der eingestellten Uhrzeit wird nie gesendet – danach an jedem Tick,
    // solange das Fenster läuft und noch nicht erinnert wurde (Nachholen nach
    // Worker-Neustart, Ausfall oder blockiertem Minuten-Tick).
    if (nowMinutes < notifyMinutes) continue;

    const info = await cycleInfo(s.owner_id, s.avg_cycle_length_override);
    if (!info) continue;

    // Fokus-Fenster je Modus: Kinderwunsch -> fruchtbare Zeit, sonst -> Spaß-Zeit.
    // Zyklustag 1 = lastStart; Fenstertag n = lastStart + (n - 1).
    const isTtc = s.mode === "ttc";
    const startDay = isTtc ? s.fertile_start_day : s.window_start_day;
    if (!startDay || startDay < 1) continue;
    // Spaß-Zeit ohne Ende ("bis zur nächsten Blutung") endet am Tag davor.
    const endDay = isTtc ? s.fertile_end_day : s.window_end_day;

    const windowStart = addDays(info.lastStart, startDay - 1);
    let windowEnd =
      endDay != null ? addDays(info.lastStart, endDay - 1) : addDays(info.lastStart, info.avg - 1);
    // Startet das Fenster erst nach dem rechnerischen Ende (z. B. Start Tag 28
    // bei Ø 27 Tagen), bleibt wenigstens der Starttag übrig.
    if (diffDays(windowEnd, windowStart) < 0) windowEnd = windowStart;

    if (diffDays(todayStr, windowStart) < 0) continue; // Fenster noch nicht erreicht
    if (diffDays(todayStr, windowEnd) > 0) continue; // Fenster vorbei
    if (s.last_gv_notified === windowStart) continue; // für dieses Fenster schon erinnert

    const startsToday = todayStr === windowStart;
    const range = `${formatDe(windowStart)} – ${formatDe(windowEnd)}`;
    const ownerBody = startsToday
      ? isTtc
        ? `Heute beginnt die günstige (fruchtbare) Zeit (${range}).`
        : `Heute beginnt deine Spaß-Zeit (${range}).`
      : isTtc
        ? `Die fruchtbare Zeit läuft seit dem ${formatDe(windowStart)} (bis ${formatDe(windowEnd)}).`
        : `Deine Spaß-Zeit läuft seit dem ${formatDe(windowStart)} (bis ${formatDe(windowEnd)}).`;
    const partnerBody = startsToday
      ? isTtc
        ? `Bei ${s.display_name} beginnt heute die fruchtbare Zeit (${range}).`
        : `Bei ${s.display_name} beginnt heute die Spaß-Zeit (${range}).`
      : isTtc
        ? `Bei ${s.display_name} läuft die fruchtbare Zeit seit dem ${formatDe(windowStart)} (bis ${formatDe(windowEnd)}).`
        : `Bei ${s.display_name} läuft die Spaß-Zeit seit dem ${formatDe(windowStart)} (bis ${formatDe(windowEnd)}).`;

    const base = {
      title: isTtc ? "Fruchtbare Zeit" : "Spaß-Zeit 😊",
      url: "/dashboard",
      tag: `gv-${s.owner_id}-${windowStart}`,
    };

    const targets = new Map(); // userId -> body
    if (s.notify_audience === "owner" || s.notify_audience === "both") {
      targets.set(s.owner_id, ownerBody);
    }
    if (s.notify_audience === "partner" || s.notify_audience === "both") {
      const partners = await sql`
        select partner_id from partner_links
        where owner_id = ${s.owner_id} and status = 'accepted'
          and can_view = true and partner_id is not null`;
      for (const p of partners) {
        if (!targets.has(p.partner_id)) targets.set(p.partner_id, partnerBody);
      }
    }

    let total = 0;
    for (const [userId, body] of targets) {
      const { sent } = await sendToUser(userId, { ...base, body });
      total += sent;
    }

    if (total === 0) {
      // Nichts zugestellt (noch kein Gerät registriert o. Ä.): Merker NICHT
      // setzen, damit es der nächste Tick im laufenden Fenster erneut versucht.
      warnNoDevice(
        `gv-${s.owner_id}-${windowStart}`,
        `[worker] gv-window ${s.owner_id} (${s.mode}): kein Gerät erreicht – wird im Fenster erneut versucht`,
      );
      continue;
    }

    await sql`
      insert into cycle_settings (owner_id, last_gv_notified)
      values (${s.owner_id}, ${windowStart})
      on conflict (owner_id) do update set last_gv_notified = ${windowStart}`;
    console.log(
      `[worker] gv-window ${s.owner_id} (${s.mode}) ${windowStart}${
        startsToday ? "" : " (nachgeholt)"
      } -> ${total} Gerät(e)`,
    );
  }
}

async function pruneRateLimits() {
  // Abgelaufene Rate-Limit-Zähler entfernen (Fenster = 15 Min).
  await sql`delete from rate_limit_hits where window_start < now() - interval '1 hour'`;
}

// Kein paralleler Durchlauf: ein langsamer Tick (viele Push-Requests) darf den
// nächsten nicht überholen und Erinnerungen doppelt versenden.
let ticking = false;

async function tick() {
  if (ticking) {
    console.warn("[worker] vorheriger Durchlauf läuft noch – Tick übersprungen");
    return;
  }
  ticking = true;
  // Ein gemeinsamer Zeitstempel für den ganzen Durchlauf: sonst rutscht die
  // Uhrzeit während langsamer Push-Zustellungen in die nächste Minute.
  const now = new Date();
  try {
    await processScheduled();
    await processMedications(now);
    await processGvWindows(now);
    await pruneRateLimits();
  } catch (err) {
    console.error("[worker] tick error", err);
  } finally {
    ticking = false;
  }
}

// Warten, bis die App die Migrationen angewendet hat (Schema vorhanden),
// damit der erste Durchlauf nicht ins Leere läuft.
async function waitForSchema() {
  for (let i = 0; i < 40; i++) {
    try {
      await sql`select 1 from scheduled_notifications limit 1`;
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  console.warn("[worker] Schema nach Wartezeit nicht bereit – starte trotzdem.");
}

console.log("[worker] gestartet – warte auf Schema ...");
await waitForSchema();
console.log("[worker] Schema bereit – prüfe jede Minute fällige Benachrichtigungen");
tick();
cron.schedule("* * * * *", tick);

async function shutdown() {
  console.log("[worker] beende …");
  await sql.end();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
