import { randomInt } from "crypto";

// Einlöse-Codes für Partner-Einladungen. Sie sind das Geheimnis, das den
// Zugriff freigibt – E-Mail-Adressen taugen dafür nicht, weil sie bei der
// Registrierung nicht verifiziert werden.
//
// Alphabet ohne verwechselbare Zeichen (0/O, 1/I/L): 30 Zeichen,
// 12 Stellen ≈ 59 Bit Entropie.
const ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
const LENGTH = 12;

export function generateInviteCode(): string {
  let out = "";
  for (let i = 0; i < LENGTH; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

// Eingabe des Nutzers auf die Speicherform bringen: Großbuchstaben, ohne
// Trennzeichen. So darf der Code mit Bindestrichen oder Leerzeichen aus der
// Zwischenablage kommen.
export function normalizeInviteCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// Anzeigeform in Vierergruppen: "ABCD-EFGH-JKMN".
export function formatInviteCode(code: string): string {
  return (code.match(/.{1,4}/g) ?? [code]).join("-");
}
