// ─────────────────────────────────────────────────────────────
// Flujo OAuth 2.0 (3-legged) de LinkedIn: URL de autorización, state
// firmado (CSRF) e intercambio de code → access token (+ refresh token).
// El access token dura ~60 días; el refresh token ~365 (apps aprobadas).
// ─────────────────────────────────────────────────────────────
import { createHmac, timingSafeEqual } from "crypto";
import {
  LINKEDIN_AUTHORIZE_URL,
  LINKEDIN_TOKEN_URL,
  getLinkedInScopes,
  getLinkedInClientId,
  getLinkedInClientSecret,
} from "./config";

// ── State firmado (anti-CSRF, lleva userId + businessId) ─────

type OAuthState = {
  userId: string;
  businessId: string;
  ts: number;
};

const STATE_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutos

function signPayload(payload: string): string {
  return createHmac("sha256", getLinkedInClientSecret()).update(payload).digest("base64url");
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
    response_type: "code",
    client_id: getLinkedInClientId(),
    redirect_uri: redirectUri,
    state,
    scope: getLinkedInScopes().join(" "),
  });
  return `${LINKEDIN_AUTHORIZE_URL}?${params.toString()}`;
}

// ── Intercambio de tokens ────────────────────────────────────

export type LinkedInToken = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
};

async function tokenRequest(body: URLSearchParams): Promise<LinkedInToken> {
  const res = await fetch(LINKEDIN_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  });
  const json = (await res.json()) as LinkedInToken & { error?: string; error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || `LinkedIn OAuth error (HTTP ${res.status})`);
  }
  return json;
}

/** code → access token (+ refresh token). */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<LinkedInToken> {
  return tokenRequest(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: getLinkedInClientId(),
      client_secret: getLinkedInClientSecret(),
    })
  );
}

/** refresh token → nuevo access token (antes de los ~60 días). */
export async function refreshAccessToken(refreshToken: string): Promise<LinkedInToken> {
  return tokenRequest(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: getLinkedInClientId(),
      client_secret: getLinkedInClientSecret(),
    })
  );
}
