// ─────────────────────────────────────────────────────────────
// Flujo OAuth de Meta: URL de autorización, state firmado (CSRF)
// e intercambio de code → token corto → token largo (60 días).
// ─────────────────────────────────────────────────────────────
import { createHmac, timingSafeEqual } from "crypto";
import {
  META_DIALOG_URL,
  META_GRAPH_URL,
  getMetaScopes,
  getMetaAppId,
  getMetaAppSecret,
} from "./config";

// ── State firmado (anti-CSRF, lleva userId + businessId) ─────

type OAuthState = {
  userId: string;
  businessId: string;
  ts: number;
};

const STATE_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutos

function signPayload(payload: string): string {
  return createHmac("sha256", getMetaAppSecret()).update(payload).digest("base64url");
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
    client_id: getMetaAppId(),
    redirect_uri: redirectUri,
    state,
    scope: getMetaScopes().join(","),
    response_type: "code",
  });
  return `${META_DIALOG_URL}?${params.toString()}`;
}

// ── Intercambio de tokens ────────────────────────────────────

async function graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(params);
  const res = await fetch(`${META_GRAPH_URL}${path}?${qs.toString()}`, {
    cache: "no-store",
  });
  const json = (await res.json()) as T & { error?: { message?: string; code?: number } };
  if (!res.ok || json.error) {
    const msg = json.error?.message || `Meta Graph API error (HTTP ${res.status})`;
    throw new Error(msg);
  }
  return json;
}

type TokenResponse = { access_token: string; token_type?: string; expires_in?: number };

/** code → token de usuario de corta duración (~1-2 horas). */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<TokenResponse> {
  return graphGet<TokenResponse>("/oauth/access_token", {
    client_id: getMetaAppId(),
    client_secret: getMetaAppSecret(),
    redirect_uri: redirectUri,
    code,
  });
}

/** token corto → token de larga duración (~60 días). */
export async function exchangeForLongLivedToken(
  shortLivedToken: string
): Promise<TokenResponse> {
  return graphGet<TokenResponse>("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: getMetaAppId(),
    client_secret: getMetaAppSecret(),
    fb_exchange_token: shortLivedToken,
  });
}
