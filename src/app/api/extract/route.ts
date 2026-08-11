import { NextRequest, NextResponse } from "next/server";
import { websiteExtractAgent } from "@/lib/ai/agents";
import { logAiUsage } from "@/lib/ai-usage";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { url, businessId } = (await req.json()) as { url: string; businessId?: string };
    if (!url) return NextResponse.json({ error: "Falta url" }, { status: 400 });
    const result = await websiteExtractAgent.run({ url });
    await logAiUsage({
      userId: null,
      businessId: businessId || null,
      agent: "website-extract",
      meta: result.meta,
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
