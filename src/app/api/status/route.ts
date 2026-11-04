import { NextResponse } from "next/server";
import { getAiRuntimeStatus } from "@/lib/ai/providers";
import { hasSharp } from "@/lib/ai/image/raster";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const status = getAiRuntimeStatus();
  // NUEVO-v2 fix: exponer si `sharp` cargó en el runtime. Si es false en prod,
  // el overlay de texto NO se compone (causa raíz del bug de piezas tipográficas).
  const sharpOk = await hasSharp().catch(() => false);
  return NextResponse.json({
    ...status,
    hasOpenAI: status.hasTextAI || status.hasImageAI,
    hasSharp: sharpOk,
  });
}
