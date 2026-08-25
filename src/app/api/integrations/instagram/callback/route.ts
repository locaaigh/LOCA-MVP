import { NextRequest, NextResponse } from "next/server";
import { getInstagramRedirectUri, getInstagramScopes } from "@/lib/instagram/config";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  verifyState,
} from "@/lib/instagram/oauth";
import { fetchIgUser } from "@/lib/instagram/accounts";
import { saveConnection } from "@/lib/connections/repository";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Callback OAuth de Instagram. Registrar en el dashboard de Meta como
 * "Redirect URI" del wizard de Instagram Login:
 *   {dominio}/api/integrations/instagram/callback
 *
 * Flujo: valida state → code → token corto → token largo (60 días)
 * → /me (user_id + username) → guarda cifrado con provider="instagram".
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);

  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/settings?instagram=error&reason=${encodeURIComponent(reason)}`);

  // El usuario canceló el diálogo de autorización
  if (searchParams.get("error")) {
    return NextResponse.redirect(`${origin}/settings?instagram=cancelled`);
  }

  const code = searchParams.get("code");
  const rawState = searchParams.get("state");
  if (!code || !rawState) return fail("missing_params");

  const state = verifyState(rawState);
  if (!state) return fail("invalid_state");

  try {
    // 1. code → token de corta duración (trae el user_id app-scoped)
    const shortLived = await exchangeCodeForToken(code, getInstagramRedirectUri(origin));

    // 2. corto → larga duración (~60 días)
    const longLived = await exchangeForLongLivedToken(shortLived.access_token);
    const userToken = longLived.access_token;
    const expiresAt = longLived.expires_in
      ? new Date(Date.now() + longLived.expires_in * 1000)
      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // fallback: 60 días

    // 3. Identidad de la cuenta (username para la UI)
    const igUser = await fetchIgUser(userToken);
    const igUserId = igUser.user_id || shortLived.user_id;

    // 4. Guardar cifrado, por (usuario, negocio, provider="instagram").
    //    En IG Login se publica con el token del usuario (no hay Page token),
    //    y la cuenta de IG es a la vez el destino de publicación.
    await saveConnection({
      userId: state.userId,
      businessId: state.businessId,
      provider: "instagram",
      providerUserId: igUserId,
      accountId: igUserId,
      accountName: igUser.username ?? null,
      igUserId,
      igUsername: igUser.username ?? null,
      userAccessToken: userToken,
      pageAccessToken: null,
      tokenExpiresAt: expiresAt,
      scopes: getInstagramScopes(),
    });

    await logEvent({
      userId: state.userId,
      businessId: state.businessId,
      name: "instagram_connected",
      props: { igUserId, hasUsername: !!igUser.username },
    });

    return NextResponse.redirect(`${origin}/settings?instagram=connected`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[instagram/callback]", msg);
    return fail(msg.slice(0, 120));
  }
}
