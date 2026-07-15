import { NextRequest, NextResponse } from "next/server";
import { refreshExpiringTokens } from "@/lib/meta/refresh";
import { hasSupabaseAdminConfig } from "@/lib/supabase/admin";
import { hasMetaConfig } from "@/lib/meta/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cron diario (Vercel Cron, ver vercel.json): renueva los user tokens
 * de Meta que vencen en menos de 14 días.
 * Vercel manda "Authorization: Bearer {CRON_SECRET}" automáticamente
 * si la env var CRON_SECRET está configurada en el proyecto.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!hasMetaConfig() || !hasSupabaseAdminConfig()) {
    return NextResponse.json({ skipped: true, reason: "Meta o Supabase sin configurar" });
  }

  try {
    const summary = await refreshExpiringTokens();
    if (summary.failed.length) console.warn("[meta/refresh-tokens]", summary.failed);
    return NextResponse.json(summary);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error renovando tokens";
    console.error("[meta/refresh-tokens]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
