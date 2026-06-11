import { NextRequest, NextResponse } from "next/server";
import { extractBusinessInfoFromWebsite } from "@/lib/ai/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { url } = (await req.json()) as { url?: string };
    if (!url || !url.trim()) {
      return NextResponse.json({ error: "Falta la URL" }, { status: 400 });
    }
    const result = await extractBusinessInfoFromWebsite(url.trim());
    return NextResponse.json(result);
  } catch (e: any) {
    // Nunca rompemos el flujo: devolvemos un análisis vacío válido con aviso amable.
    return NextResponse.json({
      data: {
        confidence: 0,
        summary: { whatEvaUnderstood: "", completedFieldsCount: 0, missingFieldsCount: 0, reviewFieldsCount: 0 },
        foundFields: {},
        fieldStatuses: {},
        missingFields: [],
        lowConfidenceFields: [],
        notes: ["No se pudo leer la web."],
        mode: "basic",
      },
      meta: {
        provider: "mock",
        warning: "Eva no pudo leer la web, pero podés completar el formulario manualmente.",
      },
    });
  }
}
