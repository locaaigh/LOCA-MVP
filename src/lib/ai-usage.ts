// ─────────────────────────────────────────────────────────────
// Log de uso de IA por negocio (tokens/costo/latencia). Server-only.
// Best-effort: nunca debe romper la respuesta al usuario si falla o si
// Supabase no está configurado (modo demo).
//
// Se loguea SIEMPRE, incluso sin usage: una llamada con provider "mock"
// y warning es un fallback por error de proveedor (success=false) — antes
// esas llamadas eran invisibles y el usuario recibía contenido mock sin
// que quedara registro.
// ─────────────────────────────────────────────────────────────
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/supabase/admin";
import type { AiMeta } from "@/lib/types";

export async function logAiUsage(params: {
  userId: string | null;
  businessId: string | null;
  agent: string;
  meta: AiMeta;
}): Promise<void> {
  if (!hasSupabaseAdminConfig()) return;
  try {
    const { meta } = params;
    await getSupabaseAdmin().from("ai_usage_log").insert({
      user_id: params.userId,
      business_id: params.businessId,
      agent: params.agent,
      provider: meta.provider,
      model: meta.model,
      input_tokens: meta.usage?.inputTokens ?? 0,
      output_tokens: meta.usage?.outputTokens ?? 0,
      cost_usd: meta.usage?.costUsd ?? 0,
      duration_ms: meta.durationMs ?? null,
      success: !meta.warning,
      is_mock: meta.provider === "mock",
    });
  } catch (e) {
    console.warn("[LOCA] No se pudo loguear uso de IA:", e instanceof Error ? e.message : e);
  }
}
