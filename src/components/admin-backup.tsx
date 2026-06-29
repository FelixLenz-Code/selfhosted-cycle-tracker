"use client";

import { useActionState, useRef, useState } from "react";
import { restoreBackup, type RestoreState } from "@/app/actions/admin-backup";

const btnClass =
  "rounded-md border border-black/15 dark:border-white/20 px-3 py-1.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10";

export function AdminBackup() {
  const formRef = useRef<HTMLFormElement>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [hasFile, setHasFile] = useState(false);
  const [state, action, pending] = useActionState<RestoreState, FormData>(
    restoreBackup,
    undefined,
  );

  return (
    <section className="surface-card mt-8 p-5">
      <h2 className="text-lg font-medium">Backup &amp; Wiederherstellung</h2>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Sichert oder ersetzt den gesamten Datenbestand der Instanz (alle Nutzer,
        Zyklen, Medikamente und Einstellungen).
      </p>

      {/* Download */}
      <div className="mt-4">
        <h3 className="text-sm font-medium">Backup erstellen</h3>
        <p className="mt-1 text-xs text-black/55 dark:text-white/55">
          Lädt den kompletten Datenbestand als JSON-Datei herunter.
        </p>
        <a href="/api/admin/backup" download className={`${btnClass} mt-2 inline-block`}>
          Backup herunterladen
        </a>
      </div>

      {/* Restore */}
      <div className="mt-6 border-t border-black/10 pt-5 dark:border-white/10">
        <h3 className="text-sm font-medium text-red-700 dark:text-red-400">
          Backup wiederherstellen
        </h3>
        <p className="mt-1 text-xs text-black/55 dark:text-white/55">
          Achtung: Ersetzt <strong>alle</strong> aktuellen Daten unwiderruflich
          durch den Inhalt der hochgeladenen Datei. Im Anschluss musst du dich
          neu anmelden.
        </p>

        <form ref={formRef} action={action} className="mt-3 flex flex-col gap-3">
          <input
            type="file"
            name="backup"
            accept="application/json,.json"
            onChange={(e) => setHasFile(!!e.target.files?.length)}
            className="text-sm file:mr-3 file:rounded-md file:border file:border-black/15 file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:font-medium dark:file:border-white/20"
          />

          <label className="flex items-center gap-2 text-xs text-black/70 dark:text-white/70">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            Ich verstehe, dass dadurch alle aktuellen Daten ersetzt werden.
          </label>

          {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
          {state?.ok && <p className="text-xs text-green-600">{state.ok}</p>}

          <div>
            <button
              type="submit"
              disabled={!confirmed || !hasFile || pending}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
            >
              {pending ? "Wird wiederhergestellt …" : "Wiederherstellen"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
