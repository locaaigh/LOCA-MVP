import { NextRequest, NextResponse } from "next/server";
import { generateBusinessStrategy } from "@/lib/ai/service";
import type { Business } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { business, feedback } = (await req.json()) as {
      business: Business;
      feedback?: string;
    };
    if (!business) return NextResponse.json({ error: "Falta business" }, { status: 400 });
    const result = await generateBusinessStrategy(business, feedback);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error generando estrategia" }, { status: 500 });
  }
}
