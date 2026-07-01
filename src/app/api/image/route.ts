import { NextRequest, NextResponse } from "next/server";
import { imageAgent } from "@/lib/ai/agents";
import { resolveContent, jsonError } from "@/lib/repository/resolve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { businessId, contentId } = (await req.json()) as {
      businessId: string;
      contentId: string;
    };
    if (!businessId || !contentId)
      return NextResponse.json({ error: "Faltan businessId o contentId" }, { status: 400 });

    const resolved = resolveContent(req, businessId, contentId);
    if ("error" in resolved) return jsonError(resolved);

    const { content } = resolved;
    const result = await imageAgent.run({
      prompt: content.imagePrompt,
      format: content.imageFormat,
      label: resolved.business.name,
      concept: content.visualConcept,
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error generando imagen";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
