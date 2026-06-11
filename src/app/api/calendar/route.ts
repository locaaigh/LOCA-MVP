import { NextRequest, NextResponse } from "next/server";
import { generateContentCalendar } from "@/lib/ai/service";
import type { Business, Strategy } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { business, strategy, count, feedback } = (await req.json()) as {
      business: Business;
      strategy: Strategy;
      count: number;
      feedback?: string;
    };
    if (!business || !strategy)
      return NextResponse.json({ error: "Falta business o strategy" }, { status: 400 });
    const result = await generateContentCalendar(business, strategy, count || 16, feedback);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error generando calendario" }, { status: 500 });
  }
}
