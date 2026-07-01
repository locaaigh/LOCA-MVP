import { NextResponse } from "next/server";
import { getAiRuntimeStatus } from "@/lib/ai/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const status = getAiRuntimeStatus();
  return NextResponse.json({
    ...status,
    hasOpenAI: status.hasTextAI || status.hasImageAI,
  });
}
