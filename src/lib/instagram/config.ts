// ─────────────────────────────────────────────────────────────
// Configuración de la integración con Instagram (Instagram API with
// Instagram Login). Es un flujo APARTE del de Meta/Facebook: usa su
// propia app dentro de la app de Meta, su propio OAuth contra
// instagram.com y su propia API contra graph.instagram.com.
//
// Sirve para negocios que tienen una cuenta de Instagram profesional
// pero NO una página de Facebook. Los que sí tienen página deben
// conectar por Meta (mejor cobertura: FB + IG con un solo login).
//
// Solo servidor: nunca importar desde componentes cliente.
// ─────────────────────────────────────────────────────────────

/**
 * Base de la Graph API de Instagram. Overridable por env por si hay que
 * fijar/volver una versión sin deploy (mismo criterio que META_GRAPH_VERSION).
 */
export const INSTAGRAM_GRAPH_URL =
  process.env.INSTAGRAM_GRAPH_URL || "https://graph.instagram.com";

/** Diálogo de autorización (OAuth va contra instagram.com, no facebook.com). */
export const INSTAGRAM_AUTHORIZE_URL = "https://www.instagram.com/oauth/authorize";
/** Intercambio de code → token corto. */
export const INSTAGRAM_TOKEN_URL = "https://api.instagram.com/oauth/access_token";

/**
 * Permisos de la revisión de Instagram. SOLO estos tres.
 *
 * ⚠️ La "URL de inserción" que genera el dashboard agrega además
 * `instagram_business_manage_messages` y `instagram_business_manage_comments`.
 * NO usarlos: no se piden en App Review y, una vez publicada la app, harían
 * fallar el login de los usuarios reales por pedir permisos no aprobados.
 */
const INSTAGRAM_SCOPES = [
  "instagram_business_basic",
  "instagram_business_content_publish",
  "instagram_business_manage_insights",
];

/**
 * Scopes del OAuth de Instagram. Se pueden pisar con INSTAGRAM_SCOPES
 * (separados por coma) para probar con menos permisos mientras la app
 * de Instagram no los tenga todos habilitados.
 */
export function getInstagramScopes(): string[] {
  const raw = process.env.INSTAGRAM_SCOPES;
  if (!raw) return INSTAGRAM_SCOPES;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function hasInstagramConfig(): boolean {
  return !!(process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_SECRET);
}

export function getInstagramAppId(): string {
  const id = process.env.INSTAGRAM_APP_ID;
  if (!id) throw new Error("Falta INSTAGRAM_APP_ID en las variables de entorno");
  return id;
}

export function getInstagramAppSecret(): string {
  const secret = process.env.INSTAGRAM_APP_SECRET;
  if (!secret) throw new Error("Falta INSTAGRAM_APP_SECRET en las variables de entorno");
  return secret;
}

/**
 * Redirect URI del OAuth de Instagram. Si INSTAGRAM_OAUTH_REDIRECT_URI no
 * está seteada, se deriva del origin del request (útil en previews).
 * IMPORTANTE: la URI usada debe estar registrada en el dashboard de Meta
 * (Instagram Login → Redirect URI) carácter por carácter.
 */
export function getInstagramRedirectUri(requestOrigin: string): string {
  return (
    process.env.INSTAGRAM_OAUTH_REDIRECT_URI ||
    `${requestOrigin}/api/integrations/instagram/callback`
  );
}

/**
 * Token de verificación del webhook. Meta hace un GET en vivo al guardar el
 * webhook y espera que respondamos el `hub.challenge` solo si el
 * `hub.verify_token` coincide con este valor.
 */
export function getInstagramWebhookVerifyToken(): string | null {
  return process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || null;
}
