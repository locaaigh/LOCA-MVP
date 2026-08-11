// ─────────────────────────────────────────────────────────────
// Eventos de producto first-party (tabla events). Server-only.
// Best-effort: nunca rompe la respuesta al usuario si falla o si
// Supabase no está configurado (modo demo). Mismo criterio que
// logAiUsage (src/lib/ai-usage.ts). Ver docs/ANALYTICS-PLAN.md.
// ─────────────────────────────────────────────────────────────
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/supabase/admin";
import type { EventName } from "@/lib/analytics-events";

export async function logEvent(params: {
  userId: string | null;
  businessId?: string | null;
  name: EventName;
  props?: Record<string, unknown>;
  /** false = demo / header x-loca-user-id sin verificar. */
  isAuthenticated?: boolean;
}): Promise<void> {
  if (!hasSupabaseAdminConfig()) return;
  try {
    await getSupabaseAdmin().from("events").insert({
      user_id: params.isAuthenticated === false ? null : params.userId,
      business_id: params.businessId ?? null,
      name: params.name,
      props: params.props ?? {},
      is_authenticated: params.isAuthenticated ?? true,
    });
  } catch (e) {
    console.warn("[LOCA] No se pudo loguear evento:", e instanceof Error ? e.message : e);
  }
}
