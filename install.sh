#!/usr/bin/env bash
#
# Selfhosted Cycle Tracker — Installer & Updater.
#
#   Installieren (ein Befehl):
#     curl -fsSL https://raw.githubusercontent.com/FelixLenz-Code/selfhosted-cycle-tracker/main/install.sh | bash
#
#   Aktualisieren:
#     curl -fsSL https://raw.githubusercontent.com/FelixLenz-Code/selfhosted-cycle-tracker/main/install.sh | bash -s -- update
#     # ...oder aus dem Installationsverzeichnis:
#     ./install.sh update
#
#   Weitere Befehle: status | logs | uninstall
#
# Umgebungsvariablen:
#   CYCLE_DIR     Installationsverzeichnis        (Standard: ./selfhosted-cycle-tracker)
#   CYCLE_REF     Git-Ref (Tag/Branch/SHA)        (Standard: neuestes Release, sonst main)
#   CYCLE_PORT    Host-Port                       (Standard: 3000)
#   CYCLE_TZ      Zeitzone                        (Standard: Europe/Berlin)
#   COOKIE_SECURE "true" hinter HTTPS             (Standard: false)
#   VAPID_SUBJECT mailto:-Adresse für Web Push    (Standard: mailto:admin@example.com)
#   CYCLE_FRESH   "1" = beim Update Daten löschen & frisch aufsetzen
#   CYCLE_BUILD   "1" = Image lokal bauen statt das veröffentlichte Image zu ziehen
#
set -euo pipefail

REPO="FelixLenz-Code/selfhosted-cycle-tracker"

# ---------- Ausgabe ----------
if [ -t 1 ]; then
  B=$'\033[1m'; G=$'\033[32m'; Y=$'\033[33m'; R=$'\033[31m'; C=$'\033[36m'; N=$'\033[0m'
else
  B=''; G=''; Y=''; R=''; C=''; N=''
fi
info()  { printf '%s\n' "${C}»${N} $*"; }
ok()    { printf '%s\n' "${G}✓${N} $*"; }
warn()  { printf '%s\n' "${Y}!${N} $*" >&2; }
die()   { printf '%s\n' "${R}✗${N} $*" >&2; exit 1; }

have() { command -v "$1" >/dev/null 2>&1; }

require_tools() {
  have curl    || die "curl wird benötigt."
  have tar     || die "tar wird benötigt."
  have openssl || die "openssl wird benötigt (für Schlüsselerzeugung)."
  have docker  || die "Docker wird benötigt: https://docs.docker.com/engine/install/"
  docker info >/dev/null 2>&1 || die "Keine Verbindung zum Docker-Daemon. Läuft er, und ist dein Nutzer in der 'docker'-Gruppe (oder nutze sudo)?"
}

detect_compose() {
  if docker compose version >/dev/null 2>&1; then COMPOSE="docker compose"
  elif have docker-compose; then COMPOSE="docker-compose"
  else die "Docker Compose nicht gefunden. Bitte das Compose-Plugin installieren."; fi
}

compose() { ( cd "$DIR" && $COMPOSE "$@" ); }

compose_up() {
  local build=0
  if [ "${CYCLE_BUILD:-0}" = 1 ]; then
    info "CYCLE_BUILD=1 — Image wird lokal gebaut."
    build=1
  elif compose pull 2>/dev/null; then
    ok "Vorgebautes Image geladen — kein lokaler Build nötig."
  else
    warn "Kein passendes Image verfügbar (oder offline) — baue lokal; das kann einige Minuten dauern."
    build=1
  fi
  local extra=""
  [ "$build" = 1 ] && extra="--build"
  compose up -d $extra || die "Container konnten nicht gestartet werden. Logs: ${B}$0 logs${N}"
}

gen_secret()   { openssl rand -hex 32; }
gen_password() { openssl rand -base64 32 | tr -dc 'A-Za-z0-9' | head -c 24; }

# Erzeugt ein VAPID-Schlüsselpaar (P-256) -> setzt VAPID_PUB / VAPID_PRIV (base64url).
gen_vapid() {
  local tmp; tmp=$(mktemp -d)
  openssl ecparam -name prime256v1 -genkey -noout -out "$tmp/p.pem" 2>/dev/null
  VAPID_PRIV=$(openssl ec -in "$tmp/p.pem" -outform DER 2>/dev/null | tail -c +8 | head -c 32 \
               | openssl base64 -A | tr '+/' '-_' | tr -d '=')
  VAPID_PUB=$(openssl ec -in "$tmp/p.pem" -pubout -outform DER 2>/dev/null | tail -c 65 \
              | openssl base64 -A | tr '+/' '-_' | tr -d '=')
  rm -rf "$tmp"
  [ -n "$VAPID_PUB" ] && [ -n "$VAPID_PRIV" ] || die "VAPID-Schlüssel konnten nicht erzeugt werden."
}

resolve_ref() {
  if [ -n "${CYCLE_REF:-}" ]; then printf '%s' "$CYCLE_REF"; return; fi
  local tag
  tag=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" 2>/dev/null \
        | grep -m1 '"tag_name"' | sed -E 's/.*"tag_name"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/' || true)
  [ -n "$tag" ] && printf '%s' "$tag" || printf 'main'
}

download_into() {
  local ref="$1" dest="$2"
  info "Lade ${B}$REPO@$ref${N} ..."
  curl -fsSL "https://codeload.github.com/$REPO/tar.gz/$ref" \
    | tar -xz --strip-components=1 -C "$dest" \
    || die "Download/Entpacken für Ref '$ref' fehlgeschlagen."
}

# Aktualisiert/ergänzt einen Schlüssel in der .env.
set_env() {
  local key="$1" val="$2" file="$DIR/.env"
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    local tmp; tmp=$(mktemp)
    grep -v "^${key}=" "$file" > "$tmp"; printf "%s='%s'\n" "$key" "$val" >> "$tmp"; mv "$tmp" "$file"
  else
    printf "%s='%s'\n" "$key" "$val" >> "$file"
  fi
}

# ---------- .env erzeugen ----------
write_env() {
  local dbpass session_secret app_port cookie_secure tz subject
  dbpass=$(gen_password)
  session_secret=$(gen_secret)
  app_port="${CYCLE_PORT:-3000}"
  cookie_secure="${COOKIE_SECURE:-false}"
  tz="${CYCLE_TZ:-Europe/Berlin}"
  subject="${VAPID_SUBJECT:-mailto:admin@example.com}"
  gen_vapid

  local src="$DIR/.env.example" out="$DIR/.env"
  [ -f "$src" ] || die ".env.example fehlt im Download — Abbruch."
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      POSTGRES_USER=*)                 printf "POSTGRES_USER='cycle'\n";;
      POSTGRES_PASSWORD=*)             printf "POSTGRES_PASSWORD='%s'\n" "$dbpass";;
      POSTGRES_DB=*)                   printf "POSTGRES_DB='cycle'\n";;
      DATABASE_URL=*)                  printf "DATABASE_URL='postgres://cycle:%s@db:5432/cycle'\n" "$dbpass";;
      APP_PORT=*)                      printf "APP_PORT='%s'\n" "$app_port";;
      APP_TIMEZONE=*)                  printf "APP_TIMEZONE='%s'\n" "$tz";;
      COOKIE_SECURE=*)                 printf "COOKIE_SECURE='%s'\n" "$cookie_secure";;
      SESSION_SECRET=*)                printf "SESSION_SECRET='%s'\n" "$session_secret";;
      NEXT_PUBLIC_VAPID_PUBLIC_KEY=*)  printf "NEXT_PUBLIC_VAPID_PUBLIC_KEY='%s'\n" "$VAPID_PUB";;
      VAPID_PRIVATE_KEY=*)             printf "VAPID_PRIVATE_KEY='%s'\n" "$VAPID_PRIV";;
      VAPID_SUBJECT=*)                 printf "VAPID_SUBJECT='%s'\n" "$subject";;
      IMAGE_TAG=*)                     printf "IMAGE_TAG='%s'\n" "${IMAGE_TAG:-latest}";;
      *)                               printf '%s\n' "$line";;
    esac
  done < "$src" > "$out"
  chmod 600 "$out"
  ok "Wrote ${B}$out${N} (DB-Passwort, Session-Secret & VAPID-Keys generiert)."
}

merge_new_env_keys() {
  local src="$DIR/.env.example" env="$DIR/.env" key added=0
  [ -f "$src" ] && [ -f "$env" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ''|\#*) continue;; esac
    key="${line%%=*}"
    if ! grep -q "^${key}=" "$env"; then
      printf '%s\n' "$line" >> "$env"
      warn "Neue Einstellung mit Standardwert ergänzt: ${B}$key${N} — bitte prüfen."
      added=1
    fi
  done < "$src"
  [ "$added" = 0 ] || warn "Einige neue Einstellungen nutzen Beispiel-Standards — ggf. $env anpassen."
}

current_version() { cat "$DIR/.cycle-version" 2>/dev/null || echo "unbekannt"; }

access_url() {
  local port; port=$(grep -m1 '^APP_PORT=' "$DIR/.env" 2>/dev/null | sed -E "s/APP_PORT='?([^']*)'?/\1/"); port="${port:-3000}"
  local host; host=$(hostname -I 2>/dev/null | awk '{print $1}'); host="${host:-localhost}"
  printf 'http://%s:%s' "$host" "$port"
}

# ---------- Befehle ----------
cmd_install() {
  require_tools; detect_compose

  if [ -f "$DIR/docker-compose.yml" ] && [ -f "$DIR/.env" ]; then
    info "Bestehende Installation in ${B}$DIR${N} erkannt — führe Update aus."
    cmd_update "$@"; return
  fi

  local ref; ref=$(resolve_ref)
  mkdir -p "$DIR"
  download_into "$ref" "$DIR"
  printf '%s\n' "$ref" > "$DIR/.cycle-version"
  export IMAGE_TAG="$ref"

  info "Konfiguriere ${B}$DIR/.env${N} ..."
  write_env

  info "Starte Container ..."
  compose_up

  echo
  ok "${B}Selfhosted Cycle Tracker ${ref}${N} läuft."
  printf '   %sURL:%s   %s\n' "$B" "$N" "$(access_url)"
  echo
  info "Erstes Konto anlegen: ${C}$(access_url)/register${N}"
  info "Verwalten:  ${B}$0 status${N} · ${B}$0 logs${N} · ${B}$0 update${N}"
  [ "$(grep -m1 '^COOKIE_SECURE=' "$DIR/.env" | grep -c true || true)" = 1 ] || \
    info "Hinter HTTPS? Dann ${B}COOKIE_SECURE=true${N} in $DIR/.env setzen und ${B}$0 update${N} ausführen."
}

choose_update_mode() {
  if [ "${FRESH:-0}" = 1 ]; then UPDATE_MODE=fresh; return; fi
  if [ "${KEEP:-0}" = 1 ];  then UPDATE_MODE=keep;  return; fi
  local tty_ok=0
  if { : </dev/tty; } 2>/dev/null; then tty_ok=1; fi
  if [ "$tty_ok" != 1 ]; then UPDATE_MODE=keep; return; fi
  printf '\n' >/dev/tty
  printf '%s\n' "${B}Wie möchtest du aktualisieren?${N}" >/dev/tty
  printf '  %s1)%s Daten und Einstellungen behalten (Standard)\n' "$B" "$N" >/dev/tty
  printf '  %s2)%s Frisch — Datenbank UND .env löschen, komplett neu aufsetzen\n' "$B" "$N" >/dev/tty
  printf '%s' "Auswahl [1]: " >/dev/tty
  local ans; read -r ans </dev/tty || true
  case "$ans" in 2) UPDATE_MODE=fresh;; *) UPDATE_MODE=keep;; esac
}

confirm_fresh() {
  [ "${ASSUME_YES:-0}" = 1 ] && return 0
  local tty_ok=0
  if { : </dev/tty; } 2>/dev/null; then tty_ok=1; fi
  [ "$tty_ok" = 1 ] || die "Frische Neuinstallation braucht Bestätigung, aber kein Terminal verfügbar. Mit ${B}--yes${N} erneut ausführen."
  warn "Frische Neuinstallation LÖSCHT die Datenbank (alle Konten, Zyklus-/Medikamentendaten) UND ${B}$DIR/.env${N} (Secrets, VAPID-Keys)."
  printf '%s' "${R}Zum Bestätigen 'RESET' eingeben:${N} " >/dev/tty
  local c; read -r c </dev/tty || true
  [ "$c" = "RESET" ] || die "Abgebrochen — nichts gelöscht."
}

cmd_update_fresh() {
  confirm_fresh
  local new; new=$(resolve_ref)
  info "Frische Installation in ${B}$DIR${N} → Version ${B}$new${N}."

  info "Stoppe Container und entferne das Datenbank-Volume ..."
  compose down -v || true

  info "Aktualisiere Code auf ${B}$new${N} ..."
  download_into "$new" "$DIR"
  rm -f "$DIR/.env"
  printf '%s\n' "$new" > "$DIR/.cycle-version"
  export IMAGE_TAG="$new"

  info "Konfiguriere ${B}$DIR/.env${N} ..."
  write_env

  info "Starte Container (Migrationen laufen automatisch) ..."
  compose_up

  echo
  ok "${B}Selfhosted Cycle Tracker ${new}${N} läuft — frische Installation."
  printf '   %sURL:%s   %s\n' "$B" "$N" "$(access_url)"
  info "Erstes Konto anlegen: ${C}$(access_url)/register${N}"
}

cmd_update() {
  require_tools; detect_compose
  [ -f "$DIR/docker-compose.yml" ] || die "Keine Installation in ${B}$DIR${N}. CYCLE_DIR setzen oder zuerst installieren."

  local force=0
  FRESH=0; KEEP=0; ASSUME_YES=0
  for a in "$@"; do
    case "$a" in
      --force)         force=1;;
      --fresh|--reset) FRESH=1;;
      --keep)          KEEP=1;;
      --yes|-y)        ASSUME_YES=1;;
      *)               warn "Ignoriere unbekannte Update-Option: ${B}$a${N}";;
    esac
  done
  [ "${CYCLE_FRESH:-0}" = 1 ] && FRESH=1

  local UPDATE_MODE; choose_update_mode
  if [ "$UPDATE_MODE" = fresh ]; then cmd_update_fresh; return; fi

  # ---- keep: Daten (DB-Volume) und Einstellungen (.env) behalten ----
  local cur new; cur=$(current_version); new=$(resolve_ref)
  info "Installiert: ${B}$cur${N}   →   verfügbar: ${B}$new${N}"
  if [ "$cur" = "$new" ] && [ "$force" != 1 ]; then
    ok "Bereits aktuell. ${B}update --force${N} erzwingt einen Neustart."
    return 0
  fi

  local tmp; tmp=$(mktemp -d)
  cp "$DIR/.env" "$tmp/.env" 2>/dev/null || die "Bestehende $DIR/.env nicht gefunden — Update abgebrochen."

  info "Stoppe Container (Datenbank-Volume bleibt erhalten) ..."
  compose down || true

  info "Aktualisiere Code auf ${B}$new${N} ..."
  download_into "$new" "$DIR"
  cp "$tmp/.env" "$DIR/.env"; rm -rf "$tmp"
  printf '%s\n' "$new" > "$DIR/.cycle-version"
  set_env IMAGE_TAG "$new"
  export IMAGE_TAG="$new"
  merge_new_env_keys

  info "Starte (Migrationen laufen automatisch) ..."
  compose_up

  ok "Aktualisiert auf ${B}$new${N}.  ${C}$(access_url)${N}"
}

cmd_status()    { detect_compose; [ -f "$DIR/docker-compose.yml" ] || die "Keine Installation in $DIR."; info "Version: ${B}$(current_version)${N}  ·  ${C}$(access_url)${N}"; compose ps; }
cmd_logs()      { detect_compose; [ -f "$DIR/docker-compose.yml" ] || die "Keine Installation in $DIR."; compose logs -f --tail=100; }
cmd_uninstall() {
  detect_compose; [ -f "$DIR/docker-compose.yml" ] || die "Keine Installation in $DIR."
  warn "Stoppt die App. Mit ${B}--purge${N} wird auch das Datenbank-Volume GELÖSCHT (unwiderruflich)."
  if [ "${1:-}" = "--purge" ]; then compose down -v; warn "Datenbank-Volume entfernt."; else compose down; fi
  ok "Gestoppt. Dateien bleiben in ${B}$DIR${N} (bei Bedarf manuell löschen)."
}

usage() {
  cat <<EOF
${B}Selfhosted Cycle Tracker — Installer${N}

  install              Aktuelle Version laden und starten (Standard)
  update [Optionen]    Bestehende Installation aktualisieren. Ohne Flag wird
                       gefragt, ob Daten & Einstellungen erhalten bleiben oder
                       frisch aufgesetzt wird.
                         --force   Neustart erzwingen, auch wenn aktuell
                         --keep    Daten & Einstellungen behalten (ohne Nachfrage)
                         --fresh   Datenbank UND .env löschen, frisch aufsetzen
                         --yes     --fresh vorab bestätigen (nicht-interaktiv)
  status               Laufende Container und Version anzeigen
  logs                 Logs verfolgen
  uninstall [--purge]  Stoppen (mit --purge auch das Datenbank-Volume löschen)

Env: CYCLE_DIR, CYCLE_REF, CYCLE_PORT, CYCLE_TZ, COOKIE_SECURE, VAPID_SUBJECT, CYCLE_FRESH, CYCLE_BUILD
EOF
}

# ---------- Dispatch ----------
CMD="${1:-install}"; [ $# -gt 0 ] && shift || true

if [ -n "${CYCLE_DIR:-}" ]; then
  DIR="$CYCLE_DIR"
elif [ "$CMD" != "install" ] && [ -f "./docker-compose.yml" ] && { [ -f "./.cycle-version" ] || [ -f "./.env" ]; }; then
  DIR="."
elif [ -f "./selfhosted-cycle-tracker/docker-compose.yml" ]; then
  DIR="./selfhosted-cycle-tracker"
else
  DIR="./selfhosted-cycle-tracker"
fi

case "$CMD" in
  install)            cmd_install "$@" ;;
  update|upgrade)     cmd_update "$@" ;;
  status|ps)          cmd_status ;;
  logs)               cmd_logs ;;
  uninstall|remove)   cmd_uninstall "$@" ;;
  -h|--help|help)     usage ;;
  *)                  warn "Unbekannter Befehl: $CMD"; usage; exit 1 ;;
esac
