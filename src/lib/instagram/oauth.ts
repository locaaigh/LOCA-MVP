// ─────────────────────────────────────────────────────────────
// Flujo OAuth de Instagram (Instagram API with Instagram Login):
// URL de autorización, state firmado (CSRF) e intercambio de
// code → token corto → token largo (60 días).
//
// A diferencia de Meta: el authorize va contra instagram.com, el
// intercambio de code contra api.instagram.com y el canje a token
// largo / refresh contra graph.instagram.com.
// ─────────────────────────────────────────────────────────────
import { createHmac, timingSafeEqual } from "crypto";
import {
  INSTAGRAM_AUTHORIZE_URL,
  INSTAGRAM_TOKEN_URL,
  getInstagramScopes,
  getInstagramAppId,
  getInstagramAppSecret,
} from "./config";
import { igGet } from "./graph";

// ── State firmado (anti-CSRF, lleva userId + businessId) ─────

type OAuthState = {
  userId: string;
  businessId: string;
  ts: number;
};

const STATE_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutos

function signPayload(payload: string): string {
  return createHmac("sha256", getInstagramAppSecret()).update(payload).digest("base64url");
}

export function buildState(userId: string, businessId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ userId, businessId, ts: Date.now() } satisfies OAuthState)
  ).toString("base64url");
  return `${payload}.${signPayload(payload)}`;
}

export function verifyState(state: string): OAuthState | null {
  const [payload, sig] = state.split(".");
  if (!payload || !sig) return null;
  const expected = signPayload(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as OAuthState;
    if (!parsed.userId || !parsed.businessId || !parsed.ts) return null;
    if (Date.now() - parsed.ts > STATE_MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ── URL de autorización ──────────────────────────────────────

export function buildAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: getInstagramAppId(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: getInstagramScopes().join(","),
    state,
  });
  return `${INSTAGRAM_AUTHORIZE_URL}?${params.toString()}`;
}

// ── Intercambio de tokens ────────────────────────────────────

export type IgShortToken = { access_token: string; user_id: string; permissions?: string[] };
export type IgLongToken = { access_token: string; token_type?: string; expires_in?: number };

/**
 * code → token de usuario de corta duración (~1 hora). El token viene
 * con el `user_id` app-scoped, que es el {ig-user-id} de los endpoints
 * de media/insights.
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<IgShortToken> {
  const body = new URLSearchParams({
    client_id: getInstagramAppId(),
    client_secret: getInstagramAppSecret(),
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch(INSTAGRAM_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  });
  const json = (await res.json()) as IgShortToken & {
    error_message?: string;
    error_type?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_message || `Instagram OAuth error (HTTP ${res.status})`);
  }
  // El user_id puede llegar como número; normalizamos a string.
  return { ...json, user_id: String(json.user_id) };
}

/** token corto → token de larga duración (~60 días). */
export async function exchangeForLongLivedToken(shortLivedToken: string): Promise<IgLongToken> {
  return igGet<IgLongToken>("/access_token", shortLivedToken, {
    grant_type: "ig_exchange_token",
    client_secret: getInstagramAppSecret(),
  });
}

/**
 * Renueva un token de larga duración (extiende otros 60 días). Solo funciona
 * con tokens de al menos 24 hs de antigüedad y no vencidos.
 */
export async function refreshLongLivedToken(longLivedToken: string): Promise<IgLongToken> {
  return igGet<IgLongToken>("/refresh_access_token", longLivedToken, {
    grant_type: "ig_refresh_token",
  });
}
