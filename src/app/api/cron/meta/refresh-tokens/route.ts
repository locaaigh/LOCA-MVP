import { NextRequest, NextResponse } from "next/server";
import { refreshExpiringTokens } from "@/lib/meta/refresh";
import { refreshExpiringInstagramTokens } from "@/lib/instagram/refresh";
import { refreshExpiringLinkedInTokens } from "@/lib/linkedin/refresh";
import { hasSupabaseAdminConfig } from "@/lib/supabase/admin";
import { hasMetaConfig } from "@/lib/meta/config";
import { hasInstagramConfig } from "@/lib/instagram/config";
import { hasLinkedInConfig } from "@/lib/linkedin/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cron diario (Vercel Cron, ver vercel.json): renueva los tokens de larga
 * duración que vencen en menos de 14 días, tanto de Meta (fb_exchange_token)
 * como de Instagram Login (ig_refresh_token, endpoint propio).
 * Vercel manda "Authorization: Bearer {CRON_SECRET}" automáticamente
 * si la env var CRON_SECRET está configurada en el proyecto.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (
    !hasSupabaseAdminConfig() ||
    (!hasMetaConfig() && !hasInstagramConfig() && !hasLinkedInConfig())
  ) {
    return NextResponse.json({ skipped: true, reason: "Ningún proveedor o Supabase sin configurar" });
  }

  try {
    // Cada proveedor renueva por su propio endpoint; corren independientes
    // para que un fallo en uno no impida el del otro.
    const [meta, instagram, linkedin] = await Promise.all([
      hasMetaConfig() ? refreshExpiringTokens() : Promise.resolve(null),
      hasInstagramConfig() ? refreshExpiringInstagramTokens() : Promise.resolve(null),
      hasLinkedInConfig() ? refreshExpiringLinkedInTokens() : Promise.resolve(null),
    ]);
    if (meta?.failed.length) console.warn("[meta/refresh-tokens]", meta.failed);
    if (instagram?.failed.length) console.warn("[instagram/refresh-tokens]", instagram.failed);
    if (linkedin?.failed.length) console.warn("[linkedin/refresh-tokens]", linkedin.failed);
    return NextResponse.json({ meta, instagram, linkedin });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error renovando tokens";
    console.error("[meta/refresh-tokens]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
