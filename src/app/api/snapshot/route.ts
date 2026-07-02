import { NextRequest, NextResponse } from "next/server";
import { requireRepoContext, jsonError } from "@/lib/repository/resolve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Snapshot completo del usuario para hidratar el cliente al iniciar sesión. */
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireRepoContext(req);
    if ("error" in ctx) return jsonError(ctx);

    const snapshot = await ctx.repo.getSnapshot(ctx.userId);
    return NextResponse.json(snapshot);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error al cargar datos";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
