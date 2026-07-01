import { NextRequest, NextResponse } from "next/server";
import { productDescriptionAgent } from "@/lib/ai/agents";
import { productServiceSchema } from "@/lib/schemas";
import { resolveBusiness, jsonError } from "@/lib/repository/resolve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { businessId, draft } = (await req.json()) as {
      businessId: string;
      draft: unknown;
    };
    if (!businessId || !draft)
      return NextResponse.json({ error: "Faltan businessId o draft" }, { status: 400 });

    const resolved = resolveBusiness(req, businessId);
    if ("error" in resolved) return jsonError(resolved);

    const parsedDraft = productServiceSchema.safeParse(draft);
    if (!parsedDraft.success)
      return NextResponse.json({ error: "Producto/servicio inválido" }, { status: 400 });

    const result = await productDescriptionAgent.run({
      business: resolved.business,
      draft: parsedDraft.data as import("@/lib/types").ProductService,
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error generando descripción";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
