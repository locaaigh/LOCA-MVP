import { NextRequest, NextResponse } from "next/server";
import { generateContentPiece } from "@/lib/ai/service";
import type { Business, CalendarItem, Strategy } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { business, strategy, calendarItem } = (await req.json()) as {
      business: Business;
      strategy: Strategy;
      calendarItem: CalendarItem;
    };
    if (!business || !strategy || !calendarItem)
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    const result = await generateContentPiece(business, strategy, calendarItem);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error generando contenido" }, { status: 500 });
  }
}
