# Zyklustracker – Projektplan

Eine self-hostbare Webapp (PWA) zum Tracken des weiblichen Zyklus mit Paar-Funktion,
Medikamenten-Erinnerungen und Push-Benachrichtigungen.

## Entscheidungen (festgelegt)

- **Nutzermodell:** Paar-App. Die Frau ist Eigentümerin ihrer Zyklusdaten. Sie kann
  ihren Partner autorisieren; dieser darf je nach Freigabe **sehen** und/oder **eintragen**.
- **Push:** Web Push / PWA (Service Worker + VAPID). iOS nur mit zum Homescreen
  hinzugefügter PWA (ab iOS 16.4).
- **Stack:** Next.js (App Router, TypeScript) + Postgres.
- **Hosting:** Self-hosted, daher von Anfang an Docker-ready.

## Stack im Detail

- Next.js 15 (App Router, TypeScript)
- Postgres + Drizzle ORM (Migrationen)
- Auth.js (NextAuth) oder Lucia, E-Mail + Passwort
- `web-push` (VAPID) für Push
- PWA via Service Worker
- Notification-Worker als separater Node-Prozess mit `node-cron`
- Docker Compose: App + Postgres + Worker

## Architektur

```
Browser (PWA + Service Worker)
        | HTTPS
Next.js App (UI + API + Auth)
        |              \
   Postgres   <----  Notification-Worker (cron -> web-push)
```

HTTPS ist für Web Push zwingend erforderlich.

## Datenmodell (Kern)

- **users**: id, email, password_hash, display_name, created_at
- **partner_links**: owner_id (Frau), partner_id (Mann), status (pending|accepted|revoked),
  can_view, can_edit, invited_at, accepted_at
- **period_entries**: id, owner_id, start_date, end_date (null = laufend), created_by, note
- **cycle_settings**: owner_id, avg_cycle_length_override, luteal_phase_days (default 14),
  mode (ttc|avoid), window_start_offset, window_end_offset, notify_time, notify_audience
  (frau|partner|beide)
- **medications**: id, owner_id, name, dosage, active, schedule_type (fixed_time|cycle_relative),
  times[], cycle_day_from, cycle_day_to
- **medication_logs**: id, medication_id, due_at, taken_at
- **push_subscriptions**: id, user_id, endpoint, p256dh, auth, user_agent, created_at
- **scheduled_notifications**: id, user_id, type, scheduled_for, payload_json,
  status (pending|sent|failed), sent_at

Berechtigung: Daten gehören der `owner_id`. Partner-Zugriff nur bei akzeptiertem
`partner_links`-Eintrag mit passendem Flag.

## Zyklus-Logik

- **Zykluslänge:** Ø der Differenzen aufeinanderfolgender Perioden-Starts (letzte 3–6),
  oder manueller Override.
- **Nächste Periode:** letzter Start + Ø-Zykluslänge.
- **Eisprung (Schätzung):** nächste Periode − Lutealphase (~14 Tage).
- **Fruchtbares Fenster:** ~5 Tage vor bis 1 Tag nach Eisprung.

### GV-Hinweis (modusabhängig, frei konfigurierbar)

| Modus           | Zeitraum                                  | Bedeutung               |
|-----------------|-------------------------------------------|-------------------------|
| Kinderwunsch    | fruchtbares Fenster (vor/am Eisprung)     | günstige Zeit für GV    |
| Vermeidung      | nach Eisprung bis nächste Blutung         | vermeintlich unfruchtbar|

Grenzen über konfigurierbare Offsets relativ zum geschätzten Eisprung.

> ⚠️ **Disclaimer (muss in der App sichtbar sein):** Kalender-/berechnungsbasierte
> Methoden sind **kein sicheres Verhütungsmittel**. Im "Vermeidung"-Modus klarer Hinweis.

## Benachrichtigungs-Engine

Worker (node-cron, alle 1–5 Min):
1. Medikamente: feste Uhrzeiten oder zyklusabhängig (Zyklustag X–Y).
2. GV-Fenster: beim Eintritt ins konfigurierte Fenster, an gewählte Audience.
3. Später: "Periode eintragen"-Erinnerung, "Periode in N Tagen"-Vorhersage.

Versand via `web-push` + VAPID an alle `push_subscriptions` des Users.

## Roadmap

- **Phase 0 – Setup:** Next.js + TS, Postgres via Docker Compose, ORM + Migrationen, Auth.
- **Phase 1 – Zyklus-Kern:** Periode Start/Ende, Kalender/Verlauf, Vorhersagen.
- **Phase 2 – Paar-Funktion:** Partner einladen, Freigaben, gemeinsame Ansicht.
- **Phase 3 – PWA + Push:** Service Worker, Subscriptions, VAPID, Worker.
- **Phase 4 – Medikamente:** CRUD + Erinnerungen + Quittung.
- **Phase 5 – GV-Fenster:** Modus + Offsets + Disclaimer + Push.
- **Phase 6 – Self-Host-Feinschliff:** Docker-Image, env-Config, Backups, Datenschutz.

## Offene Punkte / später

- Auth-Bibliothek final wählen (Auth.js vs. Lucia).
- Verschlüsselung at rest (optional), Backup-Strategie.
- Symptom-Tracking (Temperatur, Stimmung) als spätere Erweiterung.
