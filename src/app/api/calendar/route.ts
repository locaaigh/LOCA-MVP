import { NextRequest, NextResponse } from "next/server";
import { calendarAgent } from "@/lib/ai/agents";
import { resolveStrategy, jsonError } from "@/lib/repository/resolve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { businessId, count, feedback } = (await req.json()) as {
      businessId: string;
      count: number;
      feedback?: string;
    };
    if (!businessId) return NextResponse.json({ error: "Falta businessId" }, { status: 400 });

    const resolved = await resolveStrategy(req, businessId);
    if ("error" in resolved) return jsonError(resolved);

    const result = await calendarAgent.run({
      business: resolved.business,
      strategy: resolved.strategy,
      count: count || 16,
      feedback,
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error generando calendario";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
