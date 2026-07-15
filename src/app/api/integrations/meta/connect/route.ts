import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/supabase/server";
import { hasMetaConfig, getRedirectUri } from "@/lib/meta/config";
import { buildAuthUrl, buildState } from "@/lib/meta/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Inicia el OAuth con Meta: redirige al diálogo de autorización de Facebook.
 * Requiere sesión real de Supabase (los tokens se guardan por usuario).
 */
export async function GET(req: NextRequest) {
  const { origin } = new URL(req.url);

  if (!hasMetaConfig()) {
    return NextResponse.redirect(`${origin}/settings?meta=not_configured`);
  }

  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.redirect(`${origin}/login?reason=meta_connect`);
  }

  const businessId = req.nextUrl.searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.redirect(`${origin}/settings?meta=missing_business`);
  }

  const state = buildState(userId, businessId);
  const authUrl = buildAuthUrl(getRedirectUri(origin), state);
  return NextResponse.redirect(authUrl);
}
