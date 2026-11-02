import { NextRequest, NextResponse } from "next/server";
import { imageAgent } from "@/lib/ai/agents";
import { resolveContent, jsonError } from "@/lib/repository/resolve";
import { hasSupabaseAdminConfig } from "@/lib/supabase/admin";
import { uploadContentImage } from "@/lib/supabase/storage";
import { logAiUsage } from "@/lib/ai-usage";
import { logEvent } from "@/lib/events";
import { nowIso } from "@/lib/utils";
import type { ContentItem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Pipeline completo (generación + QA + overlay) puede tardar 20 a 60 s; con
// OpenAI hasta 2 minutos. En Vercel Hobby el tope es 60 s: subir a 120+ en Pro.
export const maxDuration = 120;

/**
 * POST /api/image { businessId, contentId, concept? }
 * Genera la imagen de la pieza con la pipeline NUEVO-v2 (estilo por propósito,
 * referencias del cliente, ruteo de modelo, QA, resize exacto, overlay de texto).
 * Contrato de respuesta igual que antes ({ data: { imageUrl, prompt, provider, status, error? }, meta })
 * más `data.generation` (prompt final, modelo, intentos, QA, costo) y `data.warnings`.
 */
export async function POST(req: NextRequest) {
  try {
    const { businessId, contentId, concept } = (await req.json()) as {
      businessId: string;
      contentId: string;
      /** Concepto nuevo (regeneración con feedback visual). */
      concept?: string;
    };
    if (!businessId || !contentId)
      return NextResponse.json({ error: "Faltan businessId o contentId" }, { status: 400 });

    const resolved = await resolveContent(req, businessId, contentId);
    if ("error" in resolved) return jsonError(resolved);

    const { ctx, content, business } = resolved;
    const result = await imageAgent.run({ business, content, conceptOverride: concept?.trim() || undefined });
    const { generation } = result.data;

    // Usuarios reales: subir a Storage y devolver URL liviana en vez del base64.
    if (
      ctx.isAuthenticated &&
      hasSupabaseAdminConfig() &&
      result.data.status === "generada" &&
      result.data.imageUrl.startsWith("data:image")
    ) {
      try {
        result.data.imageUrl = await uploadContentImage(ctx.userId, contentId, result.data.imageUrl);
      } catch (e) {
        // Si Storage falla devolvemos el base64 igual: la imagen no se pierde.
        console.warn("[LOCA] Upload a Storage falló:", e instanceof Error ? e.message : e);
      }
    }

    // Metadatos de generación en el jsonb de la pieza (prompt final + modelo + QA) …
    const patched: ContentItem = {
      ...content,
      imagePrompt: generation.prompt || content.imagePrompt,
      generation,
      imageProvider: result.data.provider,
      updatedAt: nowIso(),
    };
    await ctx.repo.upsertContent(ctx.userId, patched);
    // … y los campos de imagen en sus columnas (las escribe solo el servidor).
    await ctx.repo.setContentImage(ctx.userId, contentId, {
      imageUrl: result.data.status === "generada" ? result.data.imageUrl : undefined,
      imageStatus: result.data.status,
      imageError: result.data.error,
    });

    await logAiUsage({ userId: ctx.userId, businessId, agent: "image", meta: result.meta });
    await logEvent({
      userId: ctx.userId,
      businessId,
      name: result.data.status === "generada" ? "image_generated" : "image_generation_failed",
      props: {
        contentId,
        provider: result.data.provider,
        model: generation.model,
        useCase: generation.useCase,
        family: generation.family,
        attempts: generation.attempts.length,
        overlayApplied: generation.overlayApplied,
        costUsd: generation.costUsd,
        error: result.data.error,
      },
      isAuthenticated: ctx.isAuthenticated,
    });
    // Eventos de la pipeline (QA fallido, suplente usado, regla sin rostro, etc.).
    for (const ev of generation.events) {
      await logEvent({ userId: ctx.userId, businessId, name: ev.name, props: { contentId, ...ev.props }, isAuthenticated: ctx.isAuthenticated });
    }

    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error generando imagen";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
