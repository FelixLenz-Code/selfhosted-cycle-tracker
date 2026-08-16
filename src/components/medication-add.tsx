"use client";

import { ModalButton } from "./modal-button";
import { MedicationForm } from "./medication-form";

// Anlegen passiert im Popup – die Seite zeigt oben die vorhandenen Medikamente.
export function MedicationAdd() {
  return (
    <ModalButton label="＋ Neues Medikament" title="Neues Medikament">
      {(close) => <MedicationForm onDone={close} />}
    </ModalButton>
  );
}
