import { NextRequest, NextResponse } from "next/server";
import { generateProductServiceDescription } from "@/lib/ai/service";
import type { Business, ProductService } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { business, draft } = (await req.json()) as {
      business: Business;
      draft: ProductService;
    };
    if (!business || !draft) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }
    const result = await generateProductServiceDescription(business, draft);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Error generando descripción" },
      { status: 500 }
    );
  }
}
