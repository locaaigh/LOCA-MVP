import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/supabase/server";
import {
  getConnection,
  deleteConnection,
  updateConnectionAccount,
  toPublic,
} from "@/lib/connections/repository";
import { decryptToken } from "@/lib/connections/crypto";
import { fetchAdminOrganizations } from "@/lib/linkedin/accounts";
import { hasSupabaseAdminConfig } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Estado de la conexión de LinkedIn del negocio (sin tokens, vista segura). */
export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const businessId = req.nextUrl.searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "Falta businessId" }, { status: 400 });

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ connection: null });
  }

  try {
    const row = await getConnection(userId, businessId, "linkedin");
    return NextResponse.json({ connection: row ? toPublic(row) : null });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error leyendo conexión";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * Cambiar la página destino: body { businessId, accountId }. Se valida contra
 * las páginas que el usuario realmente administra (nunca se confía en el id
 * que manda el cliente) y se guarda el nombre resuelto por LinkedIn.
 */
export async function PATCH(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { businessId?: string; accountId?: string };
  if (!body.businessId || !body.accountId) {
    return NextResponse.json({ error: "Faltan businessId o accountId" }, { status: 400 });
  }

  try {
    const row = await getConnection(userId, body.businessId, "linkedin");
    if (!row || row.status !== "active") {
      return NextResponse.json({ error: "No hay una conexión de LinkedIn activa" }, { status: 404 });
    }
    const { orgs } = await fetchAdminOrganizations(decryptToken(row.user_access_token_enc));
    const org = orgs.find((o) => o.id === body.accountId);
    if (!org) {
      return NextResponse.json(
        { error: "No administrás esa página de LinkedIn (o LinkedIn no la devolvió)" },
        { status: 403 }
      );
    }
    await updateConnectionAccount(userId, body.businessId, "linkedin", {
      accountId: org.id,
      accountName: org.name,
    });
    await logEvent({ userId, businessId: body.businessId, name: "linkedin_page_changed", props: { accountId: org.id } });
    const updated = await getConnection(userId, body.businessId, "linkedin");
    return NextResponse.json({ connection: updated ? toPublic(updated) : null });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error cambiando la página";
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
    await deleteConnection(userId, businessId, "linkedin");
    await logEvent({ userId, businessId, name: "linkedin_disconnected" });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconectando";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
