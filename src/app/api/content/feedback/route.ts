import { NextRequest, NextResponse } from "next/server";
import { regenerateContentWithFeedback } from "@/lib/ai/service";
import type { Business, ContentItem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { business, item, feedback } = (await req.json()) as {
      business: Business;
      item: ContentItem;
      feedback: string;
    };
    if (!business || !item || !feedback)
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    const result = await regenerateContentWithFeedback(business, item, feedback);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error aplicando feedback" }, { status: 500 });
  }
}
