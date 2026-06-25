#!/bin/sh
set -e

echo "[entrypoint] Warte auf Datenbank & wende Migrationen an ..."
ATTEMPTS=0
until node scripts/migrate.mjs; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge 20 ]; then
    echo "[entrypoint] Datenbank nach 20 Versuchen nicht erreichbar — Abbruch."
    exit 1
  fi
  echo "[entrypoint] DB noch nicht bereit, neuer Versuch in 3s ($ATTEMPTS/20) ..."
  sleep 3
done

echo "[entrypoint] Starte App ..."
exec "$@"
