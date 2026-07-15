import { NextRequest, NextResponse } from "next/server";
import { getRedirectUri } from "@/lib/meta/config";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  verifyState,
} from "@/lib/meta/oauth";
import { fetchMetaUser, fetchPages, pickPage } from "@/lib/meta/accounts";
import { saveConnection } from "@/lib/meta/repository";
import { getMetaScopes } from "@/lib/meta/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Callback OAuth de Meta. Registrar en Meta Console como
 * "Valid OAuth Redirect URI": {dominio}/api/integrations/meta/callback
 *
 * Flujo: valida state → code → token corto → token largo (60 días)
 * → /me + /me/accounts (page token + IG user ID) → guarda cifrado.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);

  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/settings?meta=error&reason=${encodeURIComponent(reason)}`);

  // El usuario canceló el diálogo de autorización
  if (searchParams.get("error")) {
    return NextResponse.redirect(`${origin}/settings?meta=cancelled`);
  }

  const code = searchParams.get("code");
  const rawState = searchParams.get("state");
  if (!code || !rawState) return fail("missing_params");

  const state = verifyState(rawState);
  if (!state) return fail("invalid_state");

  try {
    // 1. code → token de corta duración
    const shortLived = await exchangeCodeForToken(code, getRedirectUri(origin));

    // 2. corto → larga duración (~60 días)
    const longLived = await exchangeForLongLivedToken(shortLived.access_token);
    const userToken = longLived.access_token;
    const expiresAt = longLived.expires_in
      ? new Date(Date.now() + longLived.expires_in * 1000)
      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // fallback: 60 días

    // 3. Identidad + pages + IG business account
    const metaUser = await fetchMetaUser(userToken);
    const pages = await fetchPages(userToken);
    const page = pickPage(pages);

    // 4. Guardar todo cifrado, por (usuario, negocio)
    await saveConnection({
      userId: state.userId,
      businessId: state.businessId,
      metaUserId: metaUser.id,
      pageId: page?.id ?? null,
      pageName: page?.name ?? null,
      igUserId: page?.instagram_business_account?.id ?? null,
      igUsername: page?.instagram_business_account?.username ?? null,
      userAccessToken: userToken,
      pageAccessToken: page?.access_token ?? null,
      tokenExpiresAt: expiresAt,
      scopes: getMetaScopes(),
    });

    return NextResponse.redirect(`${origin}/settings?meta=connected`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[meta/callback]", msg);
    return fail(msg.slice(0, 120));
  }
}
