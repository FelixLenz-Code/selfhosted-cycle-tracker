"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const dialogClass =
  "m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-black/10 bg-white p-0 text-black shadow-xl backdrop:bg-black/50 dark:border-white/15 dark:bg-neutral-900 dark:text-white";

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
          <div className="flex max-h-[85vh] flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-black/10 px-5 py-3 dark:border-white/10">
              <h2 className="text-base font-semibold">{title}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Schließen"
                className="grid h-8 w-8 place-items-center rounded-full text-lg leading-none text-black/50 hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/10"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              {children(() => setOpen(false))}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
