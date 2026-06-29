# Selfhosted Cycle Tracker

Eine self-hostbare Webapp (PWA) zum Tracken des weiblichen Zyklus – mit Paar-Funktion,
Medikamenten-Erinnerungen und Push-Benachrichtigungen.

> ⚠️ **Hinweis:** Dies ist **kein sicheres Verhütungsmittel**. Kalender-/
> berechnungsbasierte Zyklusvorhersagen sind unzuverlässig. Im „Vermeidung"-Modus
> dient die App ausschließlich der Information.

## Features

- Mehrere Nutzer mit Login; die Frau ist Eigentümerin ihrer Zyklusdaten und kann
  ihren Partner autorisieren (sehen und/oder eintragen).
- Blutung Start/Ende eintragen, Verlauf, Kalender & Vorhersagen (Zykluslänge,
  nächste Periode, Eisprung-Schätzung, fruchtbares Fenster).
- Medikamenten-Erinnerungen (feste Uhrzeiten oder zyklusabhängig) als Push.
- Konfigurierbares „GV-Fenster" (Modus Kinderwunsch oder Vermeidung) als Push.
- Installierbare PWA mit Web-Push-Benachrichtigungen.
- Admin-Backup: vollständiges Instanz-Backup als JSON herunterladen und wieder
  einspielen – direkt im Browser, auch für den Umzug auf einen anderen Server.

Details und Roadmap: siehe [PLAN.md](./PLAN.md).

## Tech-Stack

- Next.js 16 (App Router, TypeScript) + Tailwind
- Postgres + Drizzle ORM
- Eigene cookie-/DB-basierte Sessions (bcrypt)
- Web Push / PWA, Hintergrund-Worker für Erinnerungen
- Docker (Image via GitHub Actions → GHCR)

## Installation (Self-Hosting)

Voraussetzungen: ein Server mit **Docker** + Docker Compose.

```bash
curl -fsSL https://raw.githubusercontent.com/FelixLenz-Code/selfhosted-cycle-tracker/main/install.sh | bash
```

Der Installer lädt den Stack, generiert Secrets (DB-Passwort, Session-Secret,
**VAPID-Keys**), startet Datenbank + App + Worker und wendet Migrationen automatisch
an. Danach das erste Konto unter `http://<server>:3000/register` anlegen.

**Aktualisieren** (fragt, ob Daten erhalten bleiben oder frisch aufgesetzt wird):

```bash
curl -fsSL https://raw.githubusercontent.com/FelixLenz-Code/selfhosted-cycle-tracker/main/install.sh | bash -s -- update
# oder aus dem Installationsverzeichnis:
./install.sh update            # --keep | --fresh | --force | --yes
```

**Bestimmte Version installieren** – standardmäßig wird das neueste Release
genutzt. Mit `CYCLE_REF` lässt sich gezielt ein Release-Tag (oder Branch/Commit)
wählen; das gilt für Installation und Update gleichermaßen:

```bash
# Neuinstallation einer bestimmten Version
curl -fsSL https://raw.githubusercontent.com/FelixLenz-Code/selfhosted-cycle-tracker/main/install.sh | CYCLE_REF=v1.6.0 bash

# Bestehende Installation auf eine bestimmte Version setzen (z. B. Downgrade)
CYCLE_REF=v1.5.3 ./install.sh update
```

Verfügbare Versionen: siehe
[Releases](https://github.com/FelixLenz-Code/selfhosted-cycle-tracker/releases).

Weitere Befehle: `./install.sh status` · `logs` · `uninstall [--purge]`.
Wichtige Env-Variablen: `CYCLE_PORT`, `CYCLE_TZ`, `COOKIE_SECURE`, `VAPID_SUBJECT`,
`CYCLE_REF` (siehe Kommentare in `install.sh`).

> Hinter HTTPS: in `.env` `COOKIE_SECURE=true` setzen und `./install.sh update`.
> Ohne HTTPS bleibt es `false`, sonst funktioniert der Login nicht.

### Betrieb hinter einem Reverse Proxy (empfohlen bei öffentlichem Zugriff)

Die App ist für den Betrieb hinter einem Reverse Proxy (Caddy, nginx, Traefik)
ausgelegt. Wichtig:

- Den App-Port **nicht** direkt öffentlich exposen, sondern nur den Proxy. So kann
  die Client-IP nicht gefälscht werden.
- Der Proxy muss den Header **`X-Forwarded-For`** mit der echten Client-IP setzen –
  darauf basiert das eingebaute **Login-/Registrierungs-Rate-Limit**
  (10 Versuche pro 15 Min je IP und je E-Mail).
- Mit TLS am Proxy zusätzlich `COOKIE_SECURE=true` setzen.

Beispiel (Caddy):

```
zyklus.example.com {
    reverse_proxy 127.0.0.1:3000
}
```

Caddy setzt `X-Forwarded-For`/`X-Forwarded-Proto` automatisch.

### Manuell mit Docker Compose

```bash
git clone https://github.com/FelixLenz-Code/selfhosted-cycle-tracker.git
cd selfhosted-cycle-tracker
cp .env.example .env          # Werte setzen (DB-Passwort, SESSION_SECRET, VAPID-Keys)
docker compose up -d          # zieht das Image (GHCR) oder baut lokal
```

VAPID-Keys erzeugen: `npx web-push generate-vapid-keys`.

### Backup & Restore

Es gibt zwei Wege. Für den normalen Gebrauch und für einen **Server-Umzug** ist
das Admin-Backup am einfachsten; `pg_dump` bleibt als datenbanknahe Alternative.

#### Admin-Backup (im Browser)

Als Admin unter **`/admin` → „Backup & Wiederherstellung"**:

- **Backup herunterladen** – schreibt den **gesamten** Datenbestand der Instanz
  (alle Nutzer, Zyklen, Medikamente, Einstellungen) in eine JSON-Datei.
- **Wiederherstellen** – ersetzt nach Bestätigung **alle** aktuellen Daten durch
  den Inhalt einer hochgeladenen Backup-Datei (in einer Transaktion, also ganz
  oder gar nicht). Im Anschluss musst du dich neu anmelden.

> ⚠️ Die JSON-Datei enthält **Passwort-Hashes und Push-Keys** – wie ein DB-Dump
> sensibel, entsprechend sicher aufbewahren.

**Umzug auf einen anderen Server:**

1. Zielserver mit **demselben App-Stand** aufsetzen (Migrationen anwenden, s. u.).
2. Erstes Konto registrieren – der erste Nutzer einer frischen Instanz wird Admin
   und dient nur als „Türöffner".
3. Unter `/admin` das Backup hochladen und wiederherstellen.
4. Mit den Zugangsdaten **aus dem Backup** neu anmelden.

Original-IDs bleiben erhalten, daher passen Partner-Verknüpfungen, Perioden,
Medikamente usw. weiterhin zusammen. Wichtig:

- **Gleicher Migrationsstand** auf dem Ziel (das Backup enthält nur Daten, kein
  Schema). Mit identischem App-Stand und `npm run db:migrate` ist das gegeben.
- **Gleiche VAPID-Keys** (`.env`), sonst werden wiederhergestellte Push-Abos
  ungültig und Nutzer müssen Benachrichtigungen neu aktivieren.
- Der **Worker** muss auf dem Zielserver laufen, damit Erinnerungen versendet werden.

Es ist ein Voll-Ersatz, kein Merge: Die Ziel-Daten werden komplett überschrieben –
ideal zum Klonen/Umziehen, nicht zum Zusammenführen zweier Instanzen.

#### Per `pg_dump` (datenbanknah)

```bash
# Backup (Datenbank)
docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql

# Restore
cat backup.sql | docker compose exec -T db psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```

Die Daten liegen im Docker-Volume `db_data`. Sichere zusätzlich deine `.env`
(enthält Secrets & VAPID-Keys).

## Lokale Entwicklung

```bash
cp .env.example .env          # DATABASE_URL auf localhost:5433 setzen (siehe Kommentar)
docker compose -f docker-compose.dev.yml up -d   # nur Postgres (Host-Port 5433)
npm install
npm run db:migrate            # Schema einspielen
npm run dev                   # http://localhost:3000
npm run worker                # optional: Erinnerungs-Worker
```

### Nützliche Scripts

| Script | Zweck |
|---|---|
| `npm run dev` | Dev-Server |
| `npm run build` / `npm start` | Production-Build / -Start |
| `npm run worker` | Notification-Worker (Erinnerungen) |
| `npm run db:generate` | Migration aus Schema erzeugen |
| `npm run db:migrate` | Migrationen anwenden |
| `npm run db:studio` | Drizzle Studio |

## Hinweis zur KI-Unterstützung

Diese Software wurde vollständig mithilfe von Claude (einem KI-Assistenten von Anthropic) entwickelt. Der Autor hat die Anforderungen definiert, Entscheidungen getroffen und das Ergebnis geprüft — der Code selbst wurde durch den Dialog mit der KI generiert.

## Haftungsausschluss

Die Software wird so bereitgestellt, wie sie ist (as-is), ohne jegliche Garantie auf Korrektheit, Vollständigkeit oder Eignung für einen bestimmten Zweck. Der Autor übernimmt keinerlei Haftung für Schäden, Datenverluste oder sonstige Probleme, die durch die Verwendung dieser Software entstehen. Die Nutzung erfolgt auf eigene Verantwortung.

## Lizenz

© 2026 Felix Lenz.

Dieses Projekt steht unter der **Creative Commons Attribution-NonCommercial 4.0
International (CC BY-NC 4.0)** Lizenz. Du darfst es teilen und bearbeiten, solange du
den Urheber nennst und es **nicht kommerziell** nutzt. Den vollständigen Text findest du
in [`LICENSE`](./LICENSE) sowie unter
<https://creativecommons.org/licenses/by-nc/4.0/>.
