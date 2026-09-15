// ─────────────────────────────────────────────────────────────
// Configuración de la integración con LinkedIn (Community Management API).
// Publica en PÁGINAS DE EMPRESA que administra el usuario que conecta.
// OAuth 2.0 3-legged contra linkedin.com; API REST versionada contra
// api.linkedin.com. Solo servidor: nunca importar desde componentes cliente.
// ─────────────────────────────────────────────────────────────

export const LINKEDIN_AUTHORIZE_URL = "https://www.linkedin.com/oauth/v2/authorization";
export const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
export const LINKEDIN_API_URL = "https://api.linkedin.com";

/**
 * Versión de la API REST de LinkedIn (header LinkedIn-Version, formato YYYYMM).
 * LinkedIn deja de aceptar versiones viejas (~1 año), así que es overridable por
 * env para poder subirla sin deploy si empieza a rechazar.
 */
export const LINKEDIN_VERSION = process.env.LINKEDIN_VERSION || "202506";

/**
 * Scopes de la Community Management API. SOLO publicación por ahora:
 * - r_basicprofile: identidad del usuario que conecta (nombre, foto).
 * - rw_organization_admin: listar las páginas de empresa que administra.
 * - w_organization_social: publicar posts en nombre de la organización.
 * Los de lectura/métricas (r_organization_social, r_member_postAnalytics) se
 * suman cuando se hagan las métricas de LinkedIn (ver backlog de producto).
 */
const LINKEDIN_SCOPES = ["r_basicprofile", "rw_organization_admin", "w_organization_social"];

export function getLinkedInScopes(): string[] {
  const raw = process.env.LINKEDIN_SCOPES;
  if (!raw) return LINKEDIN_SCOPES;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function hasLinkedInConfig(): boolean {
  return !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET);
}

export function getLinkedInClientId(): string {
  const id = process.env.LINKEDIN_CLIENT_ID;
  if (!id) throw new Error("Falta LINKEDIN_CLIENT_ID en las variables de entorno");
  return id;
}

export function getLinkedInClientSecret(): string {
  const secret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!secret) throw new Error("Falta LINKEDIN_CLIENT_SECRET en las variables de entorno");
  return secret;
}

/**
 * Redirect URI del OAuth. Si LINKEDIN_OAUTH_REDIRECT_URI no está seteada, se
 * deriva del origin del request. Debe coincidir carácter por carácter con la
 * registrada en el dashboard de LinkedIn (Auth → Authorized redirect URLs).
 */
export function getLinkedInRedirectUri(requestOrigin: string): string {
  return (
    process.env.LINKEDIN_OAUTH_REDIRECT_URI ||
    `${requestOrigin}/api/integrations/linkedin/callback`
  );
}
