import { NextResponse } from "next/server";
import { hasOpenAI, TEXT_MODEL, IMAGE_MODEL } from "@/lib/ai/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    hasOpenAI: hasOpenAI(),
    textModel: TEXT_MODEL,
    imageModel: IMAGE_MODEL,
  });
}
