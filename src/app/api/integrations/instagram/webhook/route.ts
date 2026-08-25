import { NextRequest, NextResponse } from "next/server";
import { getInstagramWebhookVerifyToken } from "@/lib/instagram/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook de Instagram. Registrar en el dashboard de Meta (Instagram Login →
 * paso 3 del wizard) como "URL de devolución de llamada":
 *   {dominio}/api/integrations/instagram/webhook
 *
 * GET  = handshake de verificación: Meta hace un GET en vivo al guardar el
 *        webhook con hub.mode=subscribe, hub.verify_token y hub.challenge.
 *        Devolvemos el challenge en texto plano SOLO si el verify_token
 *        coincide con INSTAGRAM_WEBHOOK_VERIFY_TOKEN.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expected = getInstagramWebhookVerifyToken();
  if (mode === "subscribe" && expected && token === expected && challenge) {
    // Debe ser text/plain con el challenge tal cual (no JSON).
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * POST = eventos de Instagram (cambios en la cuenta, etc.). Por ahora solo
 * los logueamos y respondemos 200 para que Meta no reintente. Cuando haya
 * casos de uso concretos se procesan acá.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[instagram/webhook] evento recibido:", JSON.stringify(body).slice(0, 500));
  } catch {
    // body vacío o no-JSON: igual respondemos 200 para no gatillar reintentos
  }
  return NextResponse.json({ ok: true });
}
