import { NextRequest, NextResponse } from "next/server";
import { googleAdsAgent, metaAdsAgent } from "@/lib/ai/agents";
import { resolveBusiness, jsonError } from "@/lib/repository/resolve";
import { logAiUsage } from "@/lib/ai-usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { businessId, platform } = (await req.json()) as {
      businessId: string;
      platform: "meta" | "google";
    };
    if (!businessId || !platform)
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

    const resolved = await resolveBusiness(req, businessId);
    if ("error" in resolved) return jsonError(resolved);

    const result =
      platform === "meta"
        ? await metaAdsAgent.run({ business: resolved.business })
        : await googleAdsAgent.run({ business: resolved.business });
    await logAiUsage({
      userId: resolved.ctx.userId,
      businessId: resolved.business.id,
      agent: platform === "meta" ? "ads-meta" : "ads-google",
      meta: result.meta,
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error generando ads";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
