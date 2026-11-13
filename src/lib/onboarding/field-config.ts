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
  /** Orden efectivo del campo (null = posición default de código). */
  sortOrder: number | null;
  /** Textos editados (null = texto default de código). */
  label: string | null;
  placeholder: string | null;
  why: string | null;
  updatedByEmail: string | null;
  updatedAt: string | null;
}

let cache: { at: number; data: FieldConfigRow[] } | null = null;
const TTL_MS = 5 * 60_000;

export async function getFieldConfigOverrides(force = false): Promise<FieldConfigRow[]> {
  if (!hasSupabaseAdminConfig()) return [];
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.data;

  let { data, error } = await getSupabaseAdmin()
    .from("onboarding_field_config")
    .select("field_id, required, critical, sort_order, label, placeholder, why, updated_by_email, updated_at");
  if (error) {
    // Migración 0010 sin correr (faltan las columnas de textos/orden): no
    // perder los overrides de required/critical — releer con el esquema 0009.
    ({ data, error } = await getSupabaseAdmin()
      .from("onboarding_field_config")
      .select("field_id, required, critical, updated_by_email, updated_at"));
  }
  if (error || !data) return cache?.data ?? [];

  const rows: FieldConfigRow[] = data.map((r: Record<string, unknown>) => ({
    fieldId: r.field_id as string,
    required: !!r.required,
    critical: !!r.critical,
    sortOrder: (r.sort_order as number | null) ?? null,
    label: (r.label as string | null) ?? null,
    placeholder: (r.placeholder as string | null) ?? null,
    why: (r.why as string | null) ?? null,
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
