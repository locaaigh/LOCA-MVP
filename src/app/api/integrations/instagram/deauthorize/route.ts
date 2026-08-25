import { NextRequest, NextResponse } from "next/server";
import { parseSignedRequest } from "@/lib/instagram/signed-request";
import { revokeByProviderUserId } from "@/lib/connections/repository";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Callback de desautorización de Instagram. Registrar en el dashboard como
 * "Deauthorize" del wizard de Instagram Login:
 *   {dominio}/api/integrations/instagram/deauthorize
 *
 * Instagram hace POST (application/x-www-form-urlencoded) con signed_request
 * cuando el usuario quita el acceso a la app. Validamos la firma con el
 * App Secret de IG y marcamos sus tokens como revocados.
 */
export async function POST(req: NextRequest) {
  let signedRequest: string | null = null;
  try {
    const form = await req.formData();
    signedRequest = (form.get("signed_request") as string) || null;
  } catch {
    // body no es form-urlencoded
  }
  if (!signedRequest) {
    return NextResponse.json({ error: "Falta signed_request" }, { status: 400 });
  }

  const payload = parseSignedRequest(signedRequest);
  if (!payload) {
    return NextResponse.json({ error: "signed_request inválido" }, { status: 401 });
  }

  try {
    const revoked = await revokeByProviderUserId("instagram", payload.user_id);
    console.log(`[instagram/deauthorize] user ${payload.user_id}: ${revoked} conexiones revocadas`);
    // Churn de integración iniciado desde Instagram (no hay userId nuestro acá).
    await logEvent({
      userId: null,
      name: "instagram_deauthorized",
      props: { igUserId: payload.user_id, revoked },
      isAuthenticated: false,
    });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error revocando tokens";
    console.error("[instagram/deauthorize]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
