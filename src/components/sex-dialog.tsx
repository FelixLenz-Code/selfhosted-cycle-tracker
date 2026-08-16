"use client";

import { ModalButton } from "./modal-button";
import { SexForm } from "./sex-form";
import type { SexEntry, SexPerson } from "@/lib/sex";

// Eintragen/Bearbeiten passiert immer im Popup – die Seite zeigt den Verlauf.
export function SexDialog({
  ownerId,
  today,
  nowTime,
  people,
  entry,
  label,
  buttonClassName,
}: {
  ownerId: string;
  today: string;
  nowTime: string;
  people: SexPerson[];
  entry?: SexEntry;
  label: string;
  buttonClassName?: string;
}) {
  return (
    <ModalButton
      label={label}
      title={entry ? "Eintrag bearbeiten" : "Sex eintragen"}
      buttonClassName={buttonClassName}
    >
      {(close) => (
        <SexForm
          ownerId={ownerId}
          today={today}
          nowTime={nowTime}
          people={people}
          entry={entry}
          onDone={close}
        />
      )}
    </ModalButton>
  );
}
