// ─────────────────────────────────────────────────────────────
// Helper para la API de LinkedIn. Dos familias de endpoints:
// - /v2/*   : API vieja, sin header de versión (ej: /v2/me).
// - /rest/* : API versionada, requiere LinkedIn-Version + X-Restli-Protocol.
// Los errores salen como LinkedInApiError con status + code para que el
// callback y la publicación puedan explicar QUÉ falló (no solo "error").
// ─────────────────────────────────────────────────────────────
import { LINKEDIN_API_URL, LINKEDIN_VERSION } from "./config";

type LiErrorBody = { message?: string; status?: number; serviceErrorCode?: number; code?: string };

export class LinkedInApiError extends Error {
  status: number;
  code: string | null;
  path: string;
  constructor(path: string, status: number, body: LiErrorBody) {
    super(describeError(path, status, body));
    this.name = "LinkedInApiError";
    this.status = status;
    this.code = body.code ?? null;
    this.path = path;
  }
}

/** Mensaje en castellano para los fallos que vimos o que la doc documenta. */
function describeError(path: string, status: number, body: LiErrorBody): string {
  const raw = body.message || "";
  if (status === 426 || body.code === "NONEXISTENT_VERSION" || /is not active/i.test(raw)) {
    return `LinkedIn ya no acepta la versión de API ${LINKEDIN_VERSION} (HTTP 426). Hay que subir LINKEDIN_VERSION.`;
  }
  if (status === 400 && body.code === "VERSION_MISSING") {
    return `LinkedIn exige el header LinkedIn-Version en ${path}`;
  }
  if (status === 401) {
    return "El token de LinkedIn venció o fue revocado. Volvé a conectar LinkedIn.";
  }
  if (status === 403) {
    return raw
      ? `LinkedIn rechazó el permiso: ${raw}`
      : "LinkedIn rechazó el permiso para esta operación (¿la app no tiene aprobado el scope?)";
  }
  if (status === 429) {
    return "LinkedIn limitó las llamadas de la app por hoy (rate limit). Probá más tarde.";
  }
  return raw || `LinkedIn API error (HTTP ${status}) en ${path}`;
}

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
  const json = (await res.json().catch(() => ({}))) as T & LiErrorBody;
  if (!res.ok) throw new LinkedInApiError(path, res.status, json);
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
  let json: T & LiErrorBody;
  try {
    json = (text ? JSON.parse(text) : {}) as T & LiErrorBody;
  } catch {
    json = {} as T & LiErrorBody;
  }
  if (!res.ok) throw new LinkedInApiError(path, res.status, json);
  return { data: json, restliId };
}
