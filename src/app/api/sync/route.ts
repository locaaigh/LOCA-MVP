import { NextRequest, NextResponse } from "next/server";
import { appSnapshotSchema, type AppSnapshotInput } from "@/lib/schemas";
import { requireRepoContext, jsonError } from "@/lib/repository/resolve";
import { nowIso } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireRepoContext(req);
    if ("error" in ctx) return jsonError(ctx);

    const body = await req.json();
    const parsed = appSnapshotSchema.safeParse({
      ...body,
      userId: ctx.userId,
      syncedAt: nowIso(),
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Snapshot inválido" }, { status: 400 });
    }

    await ctx.repo.sync(parsed.data as unknown as AppSnapshotInput);
    return NextResponse.json({ ok: true, syncedAt: parsed.data.syncedAt });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error al sincronizar";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
