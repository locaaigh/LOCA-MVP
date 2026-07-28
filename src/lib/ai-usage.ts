// ─────────────────────────────────────────────────────────────
// Log de uso de IA por negocio (tokens/costo). Server-only. Best-effort:
// nunca debe romper la respuesta al usuario si falla o si Supabase no
// está configurado (modo demo).
// ─────────────────────────────────────────────────────────────
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/supabase/admin";
import type { AiMeta } from "@/lib/types";

export async function logAiUsage(params: {
  userId: string | null;
  businessId: string | null;
  agent: string;
  meta: AiMeta;
}): Promise<void> {
  if (!hasSupabaseAdminConfig() || !params.meta.usage) return;
  try {
    await getSupabaseAdmin().from("ai_usage_log").insert({
      user_id: params.userId,
      business_id: params.businessId,
      agent: params.agent,
      provider: params.meta.provider,
      model: params.meta.model,
      input_tokens: params.meta.usage.inputTokens,
      output_tokens: params.meta.usage.outputTokens,
      cost_usd: params.meta.usage.costUsd,
    });
  } catch (e) {
    console.warn("[LOCA] No se pudo loguear uso de IA:", e instanceof Error ? e.message : e);
  }
}
