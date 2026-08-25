import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/supabase/server";
import { hasInstagramConfig, getInstagramRedirectUri } from "@/lib/instagram/config";
import { buildAuthUrl, buildState } from "@/lib/instagram/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Inicia el OAuth con Instagram (Instagram Login): redirige al diálogo de
 * autorización de instagram.com. Para negocios con cuenta de IG profesional
 * sin página de Facebook. Requiere sesión real de Supabase.
 */
export async function GET(req: NextRequest) {
  const { origin } = new URL(req.url);

  if (!hasInstagramConfig()) {
    return NextResponse.redirect(`${origin}/settings?instagram=not_configured`);
  }

  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.redirect(`${origin}/login?reason=instagram_connect`);
  }

  const businessId = req.nextUrl.searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.redirect(`${origin}/settings?instagram=missing_business`);
  }

  const state = buildState(userId, businessId);
  const authUrl = buildAuthUrl(getInstagramRedirectUri(origin), state);
  return NextResponse.redirect(authUrl);
}
