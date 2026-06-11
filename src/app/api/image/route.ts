import { NextRequest, NextResponse } from "next/server";
import { generateImageForContent } from "@/lib/ai/service";
import type { ImageFormat } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { prompt, format, label, concept } = (await req.json()) as {
      prompt: string;
      format: ImageFormat;
      label?: string;
      concept?: string;
    };
    if (!prompt) return NextResponse.json({ error: "Falta prompt" }, { status: 400 });
    const result = await generateImageForContent(prompt, format || "4:5", label, concept);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error generando imagen" }, { status: 500 });
  }
}
