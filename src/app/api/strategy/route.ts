import { NextRequest, NextResponse } from "next/server";
import { strategyAgent } from "@/lib/ai/agents";
import { resolveBusiness, jsonError } from "@/lib/repository/resolve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { businessId, feedback } = (await req.json()) as {
      businessId: string;
      feedback?: string;
    };
    if (!businessId) return NextResponse.json({ error: "Falta businessId" }, { status: 400 });

    const resolved = await resolveBusiness(req, businessId);
    if ("error" in resolved) return jsonError(resolved);

    const result = await strategyAgent.run({ business: resolved.business, feedback });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error generando estrategia";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
