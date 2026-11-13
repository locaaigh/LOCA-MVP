import { NextRequest, NextResponse } from "next/server";
import { logWebsiteAnalysis } from "@/lib/analysis-log";
import type { WebsiteAnalysis } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Log del import de .md (se parsea en el CLIENTE, por eso este endpoint).
// Público porque el onboarding corre anónimo, pero acotado: solo acepta
// source external_md (los análisis de web se loguean server-side en
// /api/extract), con payload limitado. Siempre responde 204: el log de
// calidad nunca le devuelve errores al onboarding.
const MAX_BODY_BYTES = 120_000;

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return new NextResponse(null, { status: 204 });
    const body = JSON.parse(raw) as {
      fileName?: string;
      businessId?: string;
      analysis?: Pick<WebsiteAnalysis, "confidence" | "mode" | "fieldStatuses" | "foundFields">;
    };
    if (!body.analysis || typeof body.analysis !== "object") {
      return new NextResponse(null, { status: 204 });
    }
    await logWebsiteAnalysis({
      source: "external_md",
      fileName: typeof body.fileName === "string" ? body.fileName.slice(0, 200) : null,
      businessId: typeof body.businessId === "string" ? body.businessId.slice(0, 64) : null,
      provider: "client",
      model: null,
      analysis: body.analysis,
    });
  } catch {
    // Silencioso: auditoría, no flujo.
  }
  return new NextResponse(null, { status: 204 });
}
