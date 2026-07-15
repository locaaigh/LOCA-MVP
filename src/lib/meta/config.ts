// ─────────────────────────────────────────────────────────────
// Configuración de la integración con Meta (Instagram/Facebook).
// Solo servidor: nunca importar desde componentes cliente.
// ─────────────────────────────────────────────────────────────

export const META_GRAPH_VERSION = "v21.0";
export const META_GRAPH_URL = `https://graph.facebook.com/${META_GRAPH_VERSION}`;
export const META_DIALOG_URL = `https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth`;

/** Permisos por defecto para publicar contenido y leer métricas de IG/FB. */
const DEFAULT_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
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
