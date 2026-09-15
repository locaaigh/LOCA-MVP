import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Health check para monitoreo externo (ej: UptimeRobot → alerta por mail).
 * Verifica que Supabase esté alcanzable, que es lo que se cayó en el incidente
 * del 14/09 (proyecto pausado/borrado → 504 en todo el sitio).
 *
 * - 200 { status: "ok" }        → todo bien
 * - 503 { status: "error" }     → Supabase no responde (dispara la alerta)
 *
 * Apuntá un monitor de uptime a https://app.heyloca.ai/api/health.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    // Sin Supabase configurado no hay nada que chequear (dev/preview).
    return NextResponse.json({ status: "ok", supabase: "not_configured" });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anonKey },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`supabase auth respondió ${res.status}`);
    return NextResponse.json({ status: "ok", supabase: "up" });
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ status: "error", supabase: "down", error }, { status: 503 });
  }
}
