"use client";

import { useState, type MouseEvent, type ReactNode } from "react";

// Ein Sex-Eintrag als Listenzeile. Hat er eine Notiz, klappt ein Klick auf die
// Zeile sie auf bzw. zu. Klicks auf Knöpfe, Links und in geöffnete Dialoge
// (Bearbeiten/Löschen) zählen nicht – die haben ihre eigene Aktion.
// Für Tastatur und Screenreader gibt es zusätzlich den „Notiz"-Knopf.
export function SexEntryRow({
  note,
  className = "",
  children,
}: {
  note: string | null;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (!note) return <li className={className}>{children}</li>;

  function onRowClick(e: MouseEvent<HTMLLIElement>) {
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea, label")) return;
    // Nur Dialoge innerhalb der Zeile ignorieren – die Kalender-Tagesansicht
    // liegt selbst in einem <dialog>.
    const dialog = target.closest("dialog");
    if (dialog && e.currentTarget.contains(dialog)) return;
    // Markierten Text (z. B. aus der Notiz) nicht durch Zuklappen wegnehmen.
    if (window.getSelection()?.toString()) return;
    setOpen((v) => !v);
  }

  return (
    <li className={`cursor-pointer ${className}`} onClick={onRowClick}>
      {children}
      {/* Ab sm unter den Beteiligten ausgerichtet (Uhrzeit-Spalte w-12 + gap-3). */}
      <div className="mt-1.5 sm:ml-15">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium text-black/55 hover:bg-black/10 dark:bg-white/10 dark:text-white/60 dark:hover:bg-white/15"
        >
          Notiz {open ? "▴" : "▾"}
        </button>
        {open && (
          <p className="mt-1.5 cursor-text whitespace-pre-wrap break-words rounded-lg bg-black/[0.03] px-3 py-2 text-sm text-black/70 dark:bg-white/[0.05] dark:text-white/70">
            {note}
          </p>
        )}
      </div>
    </li>
  );
}
