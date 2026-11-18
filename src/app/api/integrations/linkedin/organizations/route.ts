import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/supabase/server";
import { getConnection } from "@/lib/connections/repository";
import { decryptToken } from "@/lib/connections/crypto";
import { fetchAdminOrganizations } from "@/lib/linkedin/accounts";
import { hasSupabaseAdminConfig } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Páginas de empresa que administra el usuario conectado (con el token
 * guardado). Lo usa Settings para elegir/cambiar la página destino. Se llama
 * a demanda (no en cada carga): la app está en tier Development de LinkedIn,
 * con un cupo chico de llamadas por día.
 */
export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const businessId = req.nextUrl.searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "Falta businessId" }, { status: 400 });

  if (!hasSupabaseAdminConfig()) return NextResponse.json({ organizations: [] });

  try {
    const row = await getConnection(userId, businessId, "linkedin");
    if (!row || row.status !== "active") {
      return NextResponse.json({ error: "No hay una conexión de LinkedIn activa" }, { status: 404 });
    }
    const { orgs } = await fetchAdminOrganizations(decryptToken(row.user_access_token_enc));
    return NextResponse.json({
      organizations: orgs.map((o) => ({ id: o.id, name: o.name })),
      selectedId: row.account_id,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error listando páginas de LinkedIn";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
