// ─────────────────────────────────────────────────────────────
// Orquestador de métricas multi-plataforma. Corre un adapter por red en
// paralelo, tolera que una falle sin afectar a las demás, y arma el resumen
// general. Reemplaza el consumo directo de /api/integrations/meta/insights
// desde la pantalla /metrics.
// ─────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { requireRepoContext, jsonError } from "@/lib/repository/resolve";
import { getConnection } from "@/lib/connections/repository";
import { fetchInstagramMetrics } from "@/lib/metrics/adapters/instagram";
import { fetchFacebookMetrics, type LocaFbPost } from "@/lib/metrics/adapters/facebook";
import { fetchLinkedInMetrics } from "@/lib/metrics/adapters/linkedin";
import { computeWindow, basePlatform } from "@/lib/metrics/adapters/shared";
import { aggregate } from "@/lib/metrics/aggregate";
import type { MetricsPeriod, PlatformId, PlatformMetrics } from "@/lib/metrics/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireRepoContext(req);
    if ("error" in ctx) return jsonError(ctx);
    const { userId } = ctx;

    const businessId = req.nextUrl.searchParams.get("businessId");
    if (!businessId) return NextResponse.json({ error: "Falta businessId" }, { status: 400 });

    const period: MetricsPeriod =
      req.nextUrl.searchParams.get("period") === "7d" ? "7d" : "30d";
    const window = computeWindow(period);

    // Conexiones del negocio.
    const [fb, ig, li] = await Promise.all([
      getConnection(userId, businessId, "facebook"),
      getConnection(userId, businessId, "instagram"),
      getConnection(userId, businessId, "linkedin"),
    ]);

    // Posts publicados desde LOCA (para marcarlos y, en FB, para poder leerlos
    // por ID sin listar el feed).
    const { locaMediaIds, locaFbPosts } = await collectLocaPosts(ctx, businessId);

    const [instagram, facebook, linkedin] = await Promise.all([
      safeAdapter("instagram", window, () =>
        fetchInstagramMetrics({ facebook: fb, instagram: ig }, window, locaMediaIds)
      ),
      safeAdapter("facebook", window, () => fetchFacebookMetrics(fb, window, locaFbPosts)),
      safeAdapter("linkedin", window, () => fetchLinkedInMetrics(li, window)),
    ]);

    const platforms = [instagram, facebook, linkedin];
    const summary = aggregate(platforms);

    return NextResponse.json({
      period: { from: window.from, to: window.to, days: window.days },
      platforms,
      summary,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error consultando métricas";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Un adapter que lanza (ej. token corrupto) no debe tumbar toda la respuesta.
async function safeAdapter(
  platform: PlatformId,
  window: { days: number; from: string; to: string },
  run: () => Promise<PlatformMetrics>
): Promise<PlatformMetrics> {
  try {
    return await run();
  } catch (e) {
    const error = e instanceof Error ? e.message : "Error";
    return basePlatform(platform, "error", window, { error });
  }
}

async function collectLocaPosts(
  ctx: { userId: string; repo: { getSnapshot: (u: string) => Promise<{ contents: any[] }> } },
  businessId: string
): Promise<{ locaMediaIds: Set<string>; locaFbPosts: LocaFbPost[] }> {
  const locaMediaIds = new Set<string>();
  const locaFbPosts: LocaFbPost[] = [];
  try {
    const snap = await ctx.repo.getSnapshot(ctx.userId);
    const contents = (snap.contents || []).filter(
      (c) => c.businessId === businessId && c.status === "published"
    );
    for (const c of contents) {
      const records =
        c.publishResults?.length
          ? c.publishResults
          : c.publishedMediaId
            ? [
                {
                  platform: c.publishedPlatform || c.channel,
                  status: "published",
                  mediaId: c.publishedMediaId,
                  at: c.publishedAt,
                },
              ]
            : [];
      for (const r of records) {
        if (r.status !== "published" || !r.mediaId) continue;
        if (r.platform === "Instagram") locaMediaIds.add(r.mediaId);
        if (r.platform === "Facebook")
          locaFbPosts.push({ id: r.mediaId, caption: c.caption, publishedAt: r.at || c.publishedAt });
      }
    }
  } catch {
    /* sin contenidos: seguimos con conjuntos vacíos */
  }
  return { locaMediaIds, locaFbPosts };
}
