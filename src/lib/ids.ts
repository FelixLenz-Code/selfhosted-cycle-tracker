const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Validiert UUIDs aus Client-Eingaben (Query-Params, FormData), bevor sie in
// uuid-Spalten-Queries gelangen – verhindert Postgres-Cast-Fehler (500).
export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}
