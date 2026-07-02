import { NextRequest, NextResponse } from "next/server";
import { requireRepoContext, jsonError } from "@/lib/repository/resolve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Borrado explícito de una pieza de contenido. */
export async function DELETE(req: NextRequest) {
  try {
    const ctx = await requireRepoContext(req);
    if ("error" in ctx) return jsonError(ctx);

    const contentId = req.nextUrl.searchParams.get("id");
    if (!contentId) return NextResponse.json({ error: "Falta id" }, { status: 400 });

    await ctx.repo.deleteContent(ctx.userId, contentId);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error eliminando contenido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
