import { NextRequest, NextResponse } from "next/server";
import { getLinkedInRedirectUri, getLinkedInScopes } from "@/lib/linkedin/config";
import { exchangeCodeForToken, verifyState } from "@/lib/linkedin/oauth";
import { fetchMember, fetchAdminOrganizations, pickOrganization } from "@/lib/linkedin/accounts";
import { saveConnection } from "@/lib/connections/repository";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Callback OAuth de LinkedIn. Registrar en el dashboard (Auth → Authorized
 * redirect URLs): {dominio}/api/integrations/linkedin/callback
 *
 * Flujo: valida state → code → access token (+ refresh) → páginas de empresa
 * que administra (+ identidad) → guarda cifrado con provider="linkedin".
 *
 * Vuelve a /settings con ?linkedin=connected&pages=N (N = páginas que
 * administra; si N > 1 la card abre el selector) o ?linkedin=error&reason=…
 * La card muestra `reason` tal cual, así el usuario ve POR QUÉ falló.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);

  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/settings?linkedin=error&reason=${encodeURIComponent(reason)}`);

  // El usuario canceló el diálogo de autorización (o LinkedIn rechazó el pedido:
  // ej. unauthorized_scope_error cuando la app no tiene aprobado un scope).
  const oauthError = searchParams.get("error");
  if (oauthError) {
    if (oauthError === "user_cancelled_login" || oauthError === "user_cancelled_authorize") {
      return NextResponse.redirect(`${origin}/settings?linkedin=cancelled`);
    }
    const desc = searchParams.get("error_description") || oauthError;
    return fail(`${oauthError}: ${desc}`.slice(0, 160));
  }

  const code = searchParams.get("code");
  const rawState = searchParams.get("state");
  if (!code || !rawState) return fail("missing_params");

  const state = verifyState(rawState);
  if (!state) return fail("invalid_state");

  try {
    // 1. code → access token (+ refresh token)
    const token = await exchangeCodeForToken(code, getLinkedInRedirectUri(origin));
    const accessToken = token.access_token;
    const expiresAt = token.expires_in
      ? new Date(Date.now() + token.expires_in * 1000)
      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // fallback ~60 días

    // 2. Páginas de empresa que administra. Es lo que importa para publicar:
    //    si esto falla, la conexión no sirve y el error se muestra tal cual.
    const { orgs, memberUrn } = await fetchAdminOrganizations(accessToken);
    const org = pickOrganization(orgs);

    // 3. Identidad del usuario (r_basicprofile → /v2/me). No es crítica para
    //    publicar: si falla usamos el person URN que viene en el ACL.
    let providerUserId = memberUrn ? memberUrn.split(":").pop() || memberUrn : null;
    try {
      const member = await fetchMember(accessToken);
      providerUserId = member.id;
    } catch (e: unknown) {
      console.warn("[linkedin/callback] /v2/me falló, uso el URN del ACL:", e instanceof Error ? e.message : e);
    }
    if (!providerUserId) providerUserId = `unknown:${state.userId}`;

    // 4. Guardar cifrado, por (usuario, negocio, provider="linkedin").
    //    Se publica con el access token del usuario (admin de la org).
    await saveConnection({
      userId: state.userId,
      businessId: state.businessId,
      provider: "linkedin",
      providerUserId,
      accountId: org?.id ?? null,
      accountName: org?.name ?? null,
      userAccessToken: accessToken,
      pageAccessToken: null,
      refreshToken: token.refresh_token ?? null,
      tokenExpiresAt: expiresAt,
      scopes: token.scope ? token.scope.split(/[ ,]+/).filter(Boolean) : getLinkedInScopes(),
    });

    await logEvent({
      userId: state.userId,
      businessId: state.businessId,
      name: "linkedin_connected",
      props: { hasOrg: !!org, orgs: orgs.length, hasRefreshToken: !!token.refresh_token },
    });

    return NextResponse.redirect(`${origin}/settings?linkedin=connected&pages=${orgs.length}`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[linkedin/callback]", msg);
    return fail(msg.slice(0, 160));
  }
}
