import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/supabase/server";
import { hasLinkedInConfig, getLinkedInRedirectUri } from "@/lib/linkedin/config";
import { buildAuthUrl, buildState } from "@/lib/linkedin/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Inicia el OAuth con LinkedIn: redirige al diálogo de autorización.
 * Publica en páginas de empresa que administra el usuario. Requiere sesión real.
 */
export async function GET(req: NextRequest) {
  const { origin } = new URL(req.url);

  if (!hasLinkedInConfig()) {
    return NextResponse.redirect(`${origin}/settings?linkedin=not_configured`);
  }

  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.redirect(`${origin}/login?reason=linkedin_connect`);
  }

  const businessId = req.nextUrl.searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.redirect(`${origin}/settings?linkedin=missing_business`);
  }

  const state = buildState(userId, businessId);
  const authUrl = buildAuthUrl(getLinkedInRedirectUri(origin), state);
  return NextResponse.redirect(authUrl);
}
