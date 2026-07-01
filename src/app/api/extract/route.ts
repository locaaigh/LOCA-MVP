import { NextRequest, NextResponse } from "next/server";
import { websiteExtractAgent } from "@/lib/ai/agents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { url } = (await req.json()) as { url: string };
    if (!url) return NextResponse.json({ error: "Falta url" }, { status: 400 });
    const result = await websiteExtractAgent.run({ url });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error extrayendo web";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
