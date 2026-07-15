import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/supabase/server";
import { getConnection } from "@/lib/meta/repository";
import { decryptToken } from "@/lib/meta/crypto";
import {
  fetchIgAccountInsights,
  fetchIgMediaInsights,
  fetchPageInsights,
} from "@/lib/meta/insights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Métricas reales de Meta para el negocio.
 * - ?businessId=...            → insights de cuenta IG + página FB
 * - ?businessId=...&mediaId=.. → insights de una publicación de IG
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const businessId = req.nextUrl.searchParams.get("businessId");
    const mediaId = req.nextUrl.searchParams.get("mediaId");
    if (!businessId) return NextResponse.json({ error: "Falta businessId" }, { status: 400 });

    const connection = await getConnection(userId, businessId);
    if (!connection || connection.status !== "active" || !connection.page_access_token_enc) {
      return NextResponse.json(
        { error: "No hay una conexión activa con Meta." },
        { status: 409 }
      );
    }
    const pageToken = decryptToken(connection.page_access_token_enc);

    if (mediaId) {
      const media = await fetchIgMediaInsights(mediaId, pageToken);
      return NextResponse.json({ media });
    }

    const [ig, page] = await Promise.allSettled([
      connection.ig_user_id
        ? fetchIgAccountInsights(connection.ig_user_id, pageToken)
        : Promise.resolve(null),
      connection.page_id
        ? fetchPageInsights(connection.page_id, pageToken)
        : Promise.resolve(null),
    ]);

    return NextResponse.json({
      instagram: ig.status === "fulfilled" ? ig.value : null,
      facebook: page.status === "fulfilled" ? page.value : null,
      errors: {
        instagram: ig.status === "rejected" ? String(ig.reason?.message || ig.reason) : undefined,
        facebook: page.status === "rejected" ? String(page.reason?.message || page.reason) : undefined,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error consultando métricas";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
