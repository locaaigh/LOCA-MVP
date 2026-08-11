import { NextRequest, NextResponse } from "next/server";
import { contentAgent } from "@/lib/ai/agents";
import { resolveCalendarItem, jsonError } from "@/lib/repository/resolve";
import { logAiUsage } from "@/lib/ai-usage";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { businessId, calendarItemId } = (await req.json()) as {
      businessId: string;
      calendarItemId: string;
    };
    if (!businessId || !calendarItemId)
      return NextResponse.json({ error: "Faltan businessId o calendarItemId" }, { status: 400 });

    const resolved = await resolveCalendarItem(req, businessId, calendarItemId);
    if ("error" in resolved) return jsonError(resolved);

    const result = await contentAgent.run({
      business: resolved.business,
      strategy: resolved.strategy,
      calendarItem: resolved.calendarItem,
    });

    // Persistir la pieza apenas se crea: /api/image la va a necesitar.
    await resolved.ctx.repo.upsertContent(resolved.ctx.userId, result.data);
    await logAiUsage({
      userId: resolved.ctx.userId,
      businessId: resolved.business.id,
      agent: "content",
      meta: result.meta,
    });
    await logEvent({
      userId: resolved.ctx.userId,
      businessId: resolved.business.id,
      name: "content_generated",
      props: {
        contentId: result.data.id,
        format: result.data.format,
        channel: result.data.channel,
        isMock: result.meta.provider === "mock",
      },
      isAuthenticated: resolved.ctx.isAuthenticated,
    });

    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error generando contenido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
