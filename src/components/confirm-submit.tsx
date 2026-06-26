"use client";

import { useState } from "react";

// Submit-Button mit Doppelabfrage: erster Klick "scharf schalten", zweiter Klick
// löst die Server-Action wirklich aus. Verlässt der Fokus den Button, wird der
// Zustand zurückgesetzt. Wird fürs Löschen von Blutungen und Nutzern verwendet.
export function ConfirmSubmit({
  action,
  hidden,
  label,
  confirmLabel = "Wirklich löschen?",
  idleClassName,
  confirmClassName,
  idleAriaLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  hidden: Record<string, string>;
  label: React.ReactNode;
  confirmLabel?: React.ReactNode;
  idleClassName?: string;
  confirmClassName?: string;
  idleAriaLabel?: string;
}) {
  const [armed, setArmed] = useState(false);

  return (
    <form action={action} className="inline-flex">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button
        type="submit"
        aria-label={armed ? "Löschen bestätigen" : idleAriaLabel}
        onClick={(e) => {
          if (!armed) {
            e.preventDefault();
            setArmed(true);
          }
        }}
        onBlur={() => setArmed(false)}
        className={armed ? confirmClassName : idleClassName}
      >
        {armed ? confirmLabel : label}
      </button>
    </form>
  );
}
