import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/supabase/server";
import { getConnection, deleteConnection, toPublic } from "@/lib/meta/repository";
import { hasSupabaseAdminConfig } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Estado de la conexión Meta del negocio (sin tokens, vista segura). */
export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const businessId = req.nextUrl.searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "Falta businessId" }, { status: 400 });

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ connection: null });
  }

  try {
    const row = await getConnection(userId, businessId);
    return NextResponse.json({ connection: row ? toPublic(row) : null });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error leyendo conexión";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** Desconectar: borra la fila con los tokens. */
export async function DELETE(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const businessId = req.nextUrl.searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "Falta businessId" }, { status: 400 });

  try {
    await deleteConnection(userId, businessId);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconectando";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
