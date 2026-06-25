# Selfhosted Cycle Tracker

Eine self-hostbare Webapp (PWA) zum Tracken des weiblichen Zyklus – mit Paar-Funktion,
Medikamenten-Erinnerungen und Push-Benachrichtigungen.

> ⚠️ **Hinweis:** Dies ist **kein sicheres Verhütungsmittel**. Kalender-/
> berechnungsbasierte Zyklusvorhersagen sind unzuverlässig. Im „Vermeidung"-Modus
> dient die App ausschließlich der Information.

## Features (geplant)

- Mehrere Nutzer mit Login; die Frau ist Eigentümerin ihrer Zyklusdaten und kann
  ihren Partner autorisieren (sehen und/oder eintragen).
- Blutung Start/Ende eintragen, Verlauf & Vorhersagen (Zykluslänge, nächste Periode,
  Eisprung-Schätzung, fruchtbares Fenster).
- Medikamenten-Erinnerungen (feste Uhrzeiten oder zyklusabhängig).
- Push-Benachrichtigungen für ein konfigurierbares „GV-Fenster"
  (Modus Kinderwunsch oder Vermeidung).

Details und Roadmap: siehe [PLAN.md](./PLAN.md).

## Tech-Stack

- Next.js 16 (App Router, TypeScript) + Tailwind
- Postgres + Drizzle ORM
- Eigene cookie-/DB-basierte Sessions (bcrypt)
- Web Push / PWA (ab Phase 3)

## Lokale Entwicklung

```bash
cp .env.example .env        # Werte anpassen (SESSION_SECRET generieren)
docker compose up -d        # Postgres (Host-Port 5433)
npm install
npm run db:migrate          # Schema einspielen
npm run dev                 # http://localhost:3000
```

### Nützliche Scripts

| Script | Zweck |
|---|---|
| `npm run dev` | Dev-Server |
| `npm run build` / `npm start` | Production-Build / -Start |
| `npm run db:generate` | Migration aus Schema erzeugen |
| `npm run db:migrate` | Migrationen anwenden |
| `npm run db:push` | Schema direkt in DB pushen (Dev) |
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
