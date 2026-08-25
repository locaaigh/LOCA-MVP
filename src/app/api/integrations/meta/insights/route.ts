import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/supabase/server";
import { getConnection } from "@/lib/connections/repository";
import { decryptToken } from "@/lib/connections/crypto";
import {
  fetchIgAccountInsights,
  fetchIgMediaInsights,
  fetchPageInsights,
} from "@/lib/meta/insights";
import {
  fetchIgAccountInsights as fetchIgAccountInsightsDirect,
  fetchIgMediaInsights as fetchIgMediaInsightsDirect,
} from "@/lib/instagram/insights";

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

    // Preferimos la conexión de Meta (FB + IG). Si el negocio conectó solo
    // Instagram, usamos esa conexión y su propio host (graph.instagram.com).
    const fbConnection = await getConnection(userId, businessId, "facebook");
    if (fbConnection && fbConnection.status === "active" && fbConnection.page_access_token_enc) {
      const pageToken = decryptToken(fbConnection.page_access_token_enc);

      if (mediaId) {
        const media = await fetchIgMediaInsights(mediaId, pageToken);
        return NextResponse.json({ media });
      }

      const [ig, page] = await Promise.allSettled([
        fbConnection.ig_user_id
          ? fetchIgAccountInsights(fbConnection.ig_user_id, pageToken)
          : Promise.resolve(null),
        fbConnection.account_id
          ? fetchPageInsights(fbConnection.account_id, pageToken)
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
    }

    // Fallback: conexión de Instagram Login (solo IG, con el token del usuario).
    const igConnection = await getConnection(userId, businessId, "instagram");
    if (!igConnection || igConnection.status !== "active" || !igConnection.account_id) {
      return NextResponse.json(
        { error: "No hay una conexión activa." },
        { status: 409 }
      );
    }
    const igToken = decryptToken(igConnection.user_access_token_enc);

    if (mediaId) {
      const media = await fetchIgMediaInsightsDirect(mediaId, igToken);
      return NextResponse.json({ media });
    }

    const account = await Promise.allSettled([
      fetchIgAccountInsightsDirect(igConnection.account_id, igToken),
    ]);
    const ig = account[0];
    return NextResponse.json({
      instagram: ig.status === "fulfilled" ? ig.value : null,
      facebook: null,
      errors: {
        instagram: ig.status === "rejected" ? String(ig.reason?.message || ig.reason) : undefined,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error consultando métricas";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
