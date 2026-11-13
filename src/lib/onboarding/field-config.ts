// ─────────────────────────────────────────────────────────────
// Overrides de obligatoriedad/criticidad de los campos del onboarding.
// Fuente de verdad: tabla `onboarding_field_config` en Supabase, editable
// desde /admin sin redeploy. Los defaults viven en código
// (business-questions.ts); acá solo se leen las EXCEPCIONES.
// Si Supabase no está configurado o falla, se devuelve [] y la app queda
// con los defaults (mismo criterio que special-dates.ts).
// SOLO server-side (usa el cliente admin para leer con caché).
// ─────────────────────────────────────────────────────────────
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/supabase/admin";

export interface FieldConfigRow {
  fieldId: string;
  required: boolean;
  critical: boolean;
  updatedByEmail: string | null;
  updatedAt: string | null;
}

let cache: { at: number; data: FieldConfigRow[] } | null = null;
const TTL_MS = 5 * 60_000;

export async function getFieldConfigOverrides(force = false): Promise<FieldConfigRow[]> {
  if (!hasSupabaseAdminConfig()) return [];
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.data;

  const { data, error } = await getSupabaseAdmin()
    .from("onboarding_field_config")
    .select("field_id, required, critical, updated_by_email, updated_at");
  if (error || !data) return cache?.data ?? [];

  const rows: FieldConfigRow[] = data.map((r) => ({
    fieldId: r.field_id as string,
    required: !!r.required,
    critical: !!r.critical,
    updatedByEmail: (r.updated_by_email as string | null) ?? null,
    updatedAt: (r.updated_at as string | null) ?? null,
  }));
  cache = { at: Date.now(), data: rows };
  return rows;
}

/** Invalida el caché (lo llaman las rutas de escritura del backoffice). */
export function invalidateFieldConfigCache(): void {
  cache = null;
}
