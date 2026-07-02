import { NextRequest, NextResponse } from "next/server";
import { contentFeedbackAgent } from "@/lib/ai/agents";
import { resolveContent, jsonError } from "@/lib/repository/resolve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { businessId, contentId, feedback } = (await req.json()) as {
      businessId: string;
      contentId: string;
      feedback: string;
    };
    if (!businessId || !contentId || !feedback)
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

    const resolved = await resolveContent(req, businessId, contentId);
    if ("error" in resolved) return jsonError(resolved);

    const result = await contentFeedbackAgent.run({
      business: resolved.business,
      item: resolved.content,
      feedbackText: feedback,
    });

    await resolved.ctx.repo.upsertContent(resolved.ctx.userId, result.data);

    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error aplicando feedback";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
