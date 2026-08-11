import { NextRequest, NextResponse } from "next/server";
import { parseSignedRequest } from "@/lib/meta/signed-request";
import { revokeByMetaUserId } from "@/lib/meta/repository";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Callback de desautorización de Meta. Registrar en Meta Console como
 * "Deauthorize Callback URL": {dominio}/api/integrations/meta/deauthorize
 *
 * Meta hace POST (application/x-www-form-urlencoded) con signed_request
 * cuando el usuario elimina la app desde Facebook. Validamos la firma
 * con el App Secret y marcamos sus tokens como revocados.
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
    const revoked = await revokeByMetaUserId(payload.user_id);
    console.log(`[meta/deauthorize] user ${payload.user_id}: ${revoked} conexiones revocadas`);
    // Churn de integración iniciado desde Facebook (no hay userId nuestro acá).
    await logEvent({
      userId: null,
      name: "meta_deauthorized",
      props: { metaUserId: payload.user_id, revoked },
      isAuthenticated: false,
    });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error revocando tokens";
    console.error("[meta/deauthorize]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
