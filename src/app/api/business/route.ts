import { NextRequest, NextResponse } from "next/server";
import { requireRepoContext, jsonError } from "@/lib/repository/resolve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Borrado explícito de un negocio (única forma de eliminarlo del servidor). */
export async function DELETE(req: NextRequest) {
  try {
    const ctx = await requireRepoContext(req);
    if ("error" in ctx) return jsonError(ctx);

    const businessId = req.nextUrl.searchParams.get("id");
    if (!businessId) return NextResponse.json({ error: "Falta id" }, { status: 400 });

    await ctx.repo.deleteBusiness(ctx.userId, businessId);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error eliminando negocio";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
