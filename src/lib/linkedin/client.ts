// ─────────────────────────────────────────────────────────────
// Helper para la API de LinkedIn. Dos familias de endpoints:
// - /v2/*   : API vieja, sin header de versión (ej: /v2/me).
// - /rest/* : API versionada, requiere LinkedIn-Version + X-Restli-Protocol.
// ─────────────────────────────────────────────────────────────
import { LINKEDIN_API_URL, LINKEDIN_VERSION } from "./config";

type LiError = { message?: string; status?: number; serviceErrorCode?: number };

function baseHeaders(token: string, versioned: boolean): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "X-Restli-Protocol-Version": "2.0.0",
  };
  if (versioned) h["LinkedIn-Version"] = LINKEDIN_VERSION;
  return h;
}

export async function liGet<T>(path: string, token: string): Promise<T> {
  const versioned = path.startsWith("/rest/");
  const res = await fetch(`${LINKEDIN_API_URL}${path}`, {
    headers: baseHeaders(token, versioned),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as T & LiError;
  if (!res.ok) {
    throw new Error(json.message || `LinkedIn API error (HTTP ${res.status})`);
  }
  return json;
}

/** POST JSON. Devuelve el body parseado y el header `x-restli-id` (id del recurso creado). */
export async function liPostJson<T>(
  path: string,
  token: string,
  body: unknown
): Promise<{ data: T; restliId: string | null }> {
  const versioned = path.startsWith("/rest/");
  const res = await fetch(`${LINKEDIN_API_URL}${path}`, {
    method: "POST",
    headers: { ...baseHeaders(token, versioned), "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const restliId = res.headers.get("x-restli-id") || res.headers.get("x-linkedin-id");
  const text = await res.text();
  const json = (text ? JSON.parse(text) : {}) as T & LiError;
  if (!res.ok) {
    throw new Error(json.message || `LinkedIn API error (HTTP ${res.status})`);
  }
  return { data: json, restliId };
}
