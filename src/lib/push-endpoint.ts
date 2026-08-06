// Prüfung der Push-Endpoint-URL, bevor der Server sie anspricht.
//
// Die URL kommt aus dem Browser des Nutzers und wird von web-push ungeprüft in
// eine ausgehende Verbindung übersetzt (Host UND Port frei wählbar). Ohne diese
// Schranke könnte ein angemeldetes Konto den Server dazu bringen, interne
// Dienste zu kontaktieren (SSRF).
//
// ACHTUNG: Der Worker (worker/index.mjs) hat eine gleichlautende Kopie dieser
// Prüfung – Änderungen dort mitziehen.

const BLOCKED_HOSTNAMES = new Set(["localhost", "localhost.localdomain"]);
const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".home", ".lan"];

// IP-Literale ausschließen: Push-Dienste laufen über Namen, und Adressen sind
// der direkte Weg ins interne Netz.
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

export function isAllowedPushEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== "string" || endpoint.length === 0 || endpoint.length > 2000) {
    return false;
  }

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }

  if (url.protocol !== "https:") return false;
  // Nur der Standard-Port: verhindert das Abklopfen beliebiger Ports.
  if (url.port !== "" && url.port !== "443") return false;
  if (url.username !== "" || url.password !== "") return false;

  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host)) return false;
  if (BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) return false;
  // IPv6 kommt in URLs in eckigen Klammern, IPv4 als reine Zifferngruppen.
  if (host.startsWith("[") || IPV4.test(host)) return false;
  // Echter Domainname mit Punkt (schließt nebenbei kurze interne Hostnamen aus).
  if (!host.includes(".") || host.startsWith(".") || host.endsWith(".")) return false;

  return true;
}
