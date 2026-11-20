import { NextRequest, NextResponse } from "next/server";
import { websiteExtractAgent } from "@/lib/ai/agents";
import { logAiUsage } from "@/lib/ai-usage";
import { logWebsiteAnalysis } from "@/lib/analysis-log";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/**
 * Análisis de web con Opus (effort high): ~55 s medido en prod. Con Fluid
 * Compute el plan Hobby permite hasta 300 s; antes el tope de 60 s lo ponía
 * esta línea y el análisis quedaba al borde del timeout (issue #55).
 */
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { url, businessId } = (await req.json()) as { url: string; businessId?: string };
    if (!url) return NextResponse.json({ error: "Falta url" }, { status: 400 });
    const startedAt = Date.now();
    const result = await websiteExtractAgent.run({ url });
    await logAiUsage({
      userId: null,
      businessId: businessId || null,
      agent: "website-extract",
      meta: result.meta,
    });
    // Log de calidad (backoffice): qué entendió Eva de esta web, se concrete
    // o no el onboarding. Nunca es fatal.
    await logWebsiteAnalysis({
      source: "website",
      url,
      businessId: businessId || null,
      provider: result.meta.provider,
      model: result.meta.model,
      durationMs: Date.now() - startedAt,
      usage: result.meta.usage,
      warning: result.meta.warning,
      analysis: result.data,
    });
    // Ruta anónima (onboarding sin cuenta): mide cuánto sirve el atajo
    // de "pegar mi web" vs carga manual.
    await logEvent({
      userId: null,
      businessId: businessId || null,
      name: "website_extracted",
      props: { success: result.meta.provider !== "mock" },
      isAuthenticated: false,
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error extrayendo web";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
