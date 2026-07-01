import { NextRequest, NextResponse } from "next/server";
import { appSnapshotSchema, type AppSnapshotInput } from "@/lib/schemas";
import { getRepository } from "@/lib/repository/server-memory";
import { requireUserId, jsonError } from "@/lib/repository/resolve";
import { nowIso } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const userId = requireUserId(req);
    if (typeof userId !== "string") return jsonError(userId);

    const body = await req.json();
    const parsed = appSnapshotSchema.safeParse({
      ...body,
      userId,
      syncedAt: nowIso(),
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Snapshot inválido" }, { status: 400 });
    }

    await getRepository().sync(parsed.data as unknown as AppSnapshotInput);
    return NextResponse.json({ ok: true, syncedAt: parsed.data.syncedAt });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error al sincronizar";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
