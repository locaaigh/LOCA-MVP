import { NextRequest, NextResponse } from "next/server";
import { imageAgent } from "@/lib/ai/agents";
import { resolveContent, jsonError } from "@/lib/repository/resolve";
import { hasSupabaseAdminConfig } from "@/lib/supabase/admin";
import { uploadContentImage } from "@/lib/supabase/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { businessId, contentId } = (await req.json()) as {
      businessId: string;
      contentId: string;
    };
    if (!businessId || !contentId)
      return NextResponse.json({ error: "Faltan businessId o contentId" }, { status: 400 });

    const resolved = await resolveContent(req, businessId, contentId);
    if ("error" in resolved) return jsonError(resolved);

    const { ctx, content } = resolved;
    const result = await imageAgent.run({
      prompt: content.imagePrompt,
      format: content.imageFormat,
      label: resolved.business.name,
      concept: content.visualConcept,
    });

    // Usuarios reales: subir a Storage y devolver URL liviana en vez del base64.
    if (
      ctx.isAuthenticated &&
      hasSupabaseAdminConfig() &&
      result.data.status === "generada" &&
      result.data.imageUrl.startsWith("data:image")
    ) {
      try {
        result.data.imageUrl = await uploadContentImage(
          ctx.userId,
          contentId,
          result.data.imageUrl
        );
      } catch (e) {
        // Si Storage falla devolvemos el base64 igual: la imagen no se pierde.
        console.warn("[LOCA] Upload a Storage falló:", e instanceof Error ? e.message : e);
      }
    }

    await ctx.repo.setContentImage(ctx.userId, contentId, {
      imageUrl: result.data.status === "generada" ? result.data.imageUrl : undefined,
      imageStatus: result.data.status,
      imageError: result.data.error,
    });

    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error generando imagen";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
