"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Auf schmalen Geräten fast bildschirmbreit, damit der Inhalt Luft hat.
const dialogClass =
  "m-auto w-[calc(100%-1.5rem)] max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-0 text-[var(--foreground)] shadow-xl backdrop:bg-black/50";

// Knopf, der seinen Inhalt in einem modalen <dialog> öffnet.
// Der Inhalt wird erst beim Öffnen gerendert, damit Formulare bei jedem Öffnen
// mit frischen Default-Werten starten. `children` bekommt eine close-Funktion.
export function ModalButton({
  label,
  title,
  buttonClassName = "btn-primary",
  ariaLabel,
  children,
}: {
  label: ReactNode;
  title: string;
  buttonClassName?: string;
  ariaLabel?: string;
  children: (close: () => void) => ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  // showModal()/close() sind imperativ – React-State bleibt die Wahrheit.
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={ariaLabel}
        className={buttonClassName}
        onClick={() => setOpen(true)}
      >
        {label}
      </button>

      <dialog
        ref={ref}
        className={dialogClass}
        aria-label={title}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          // Klick auf den Backdrop (nicht auf den Inhalt) schließt den Dialog.
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        {open && (
          <div className="flex max-h-[85svh] flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-3 sm:px-5 dark:border-white/10">
              <h2 className="text-base font-semibold">{title}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Schließen"
                className="-mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg leading-none text-black/50 hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/10"
              >
                ✕
              </button>
            </div>
            {/* Scrollbereich ohne unteres Padding: So kann ein Formular einen
                sticky Fußbereich bündig an den unteren Rand setzen, ohne dass
                Inhalt in einem Rest-Padding darunter durchscrollt. Formulare
                ohne Fußbereich bringen ihren eigenen Abstand mit. */}
            <div className="overflow-y-auto px-4 pt-4 sm:px-5">
              {children(() => setOpen(false))}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
