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
 * Flujo: valida state → code → access token (+ refresh) → identidad + páginas
 * de empresa que administra → guarda cifrado con provider="linkedin".
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);

  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/settings?linkedin=error&reason=${encodeURIComponent(reason)}`);

  // El usuario canceló el diálogo de autorización
  if (searchParams.get("error")) {
    return NextResponse.redirect(`${origin}/settings?linkedin=cancelled`);
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

    // 2. Identidad + páginas de empresa que administra
    const member = await fetchMember(accessToken);
    const orgs = await fetchAdminOrganizations(accessToken);
    const org = pickOrganization(orgs);

    // 3. Guardar cifrado, por (usuario, negocio, provider="linkedin").
    //    Se publica con el access token del usuario (admin de la org).
    await saveConnection({
      userId: state.userId,
      businessId: state.businessId,
      provider: "linkedin",
      providerUserId: member.id,
      accountId: org?.id ?? null,
      accountName: org?.name ?? null,
      userAccessToken: accessToken,
      pageAccessToken: null,
      refreshToken: token.refresh_token ?? null,
      tokenExpiresAt: expiresAt,
      scopes: getLinkedInScopes(),
    });

    await logEvent({
      userId: state.userId,
      businessId: state.businessId,
      name: "linkedin_connected",
      props: { hasOrg: !!org, orgs: orgs.length },
    });

    return NextResponse.redirect(`${origin}/settings?linkedin=connected`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[linkedin/callback]", msg);
    return fail(msg.slice(0, 120));
  }
}
