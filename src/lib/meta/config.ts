// ─────────────────────────────────────────────────────────────
// Configuración de la integración con Meta (Instagram/Facebook).
// Solo servidor: nunca importar desde componentes cliente.
// ─────────────────────────────────────────────────────────────

/**
 * Versión de Graph API. Overridable por env para poder volver atrás sin
 * deploy: al subir de versión Meta deprecia métricas de Insights, y si alguna
 * de las que pide insights.ts desaparece, el endpoint falla entero.
 */
export const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v23.0";
export const META_GRAPH_URL = `https://graph.facebook.com/${META_GRAPH_VERSION}`;
export const META_DIALOG_URL = `https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth`;

/**
 * Permisos para publicar contenido y leer métricas de IG/FB.
 *
 * Solo se usan en el camino de fallback (sin META_LOGIN_CONFIG_ID). En
 * producción los permisos los define la configuration del dashboard, y la
 * lista que se manda a App Review vive ahí — incluye además `public_profile`
 * (que Meta otorga solo) y `business_management` (exigido por el caso de uso,
 * aunque este código no lo necesite). No agregarlos acá: esta lista describe
 * lo que la app realmente usa.
 */
const DEFAULT_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "read_insights",
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_insights",
];

/**
 * Scopes del OAuth. Se pueden pisar con META_SCOPES (separados por coma)
 * para probar con menos permisos mientras la app de Meta no los habilite
 * todos (ej: "pages_show_list,pages_read_engagement,pages_manage_posts").
 */
export function getMetaScopes(): string[] {
  const raw = process.env.META_SCOPES;
  if (!raw) return DEFAULT_SCOPES;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * ID de la "configuration" de Facebook Login for Business.
 * Las apps de Meta tipo *Business* no piden permisos por `scope`: los toman de
 * una configuration creada en el dashboard (Inicio de sesión con Facebook →
 * Configuraciones). Sin esta env var caemos al login clásico por scopes, que
 * sirve para apps de desarrollo pero no pasa App Review en una app Business.
 */
export function getMetaLoginConfigId(): string | null {
  return process.env.META_LOGIN_CONFIG_ID || null;
}

export function hasMetaConfig(): boolean {
  return !!(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

export function getMetaAppId(): string {
  const id = process.env.META_APP_ID;
  if (!id) throw new Error("Falta META_APP_ID en las variables de entorno");
  return id;
}

export function getMetaAppSecret(): string {
  const secret = process.env.META_APP_SECRET;
  if (!secret) throw new Error("Falta META_APP_SECRET en las variables de entorno");
  return secret;
}

/**
 * Redirect URI del OAuth. Si META_OAUTH_REDIRECT_URI no está seteada,
 * se deriva del origin del request (útil en previews de Vercel).
 * IMPORTANTE: la URI usada debe estar registrada en Meta Console.
 */
export function getRedirectUri(requestOrigin: string): string {
  return (
    process.env.META_OAUTH_REDIRECT_URI ||
    `${requestOrigin}/api/integrations/meta/callback`
  );
}
