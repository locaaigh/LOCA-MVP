// ─────────────────────────────────────────────────────────────
// Catálogo de "temporadas fuertes" / "fechas especiales" por industria.
// Fuente de verdad: tabla `special_dates_catalog` en Supabase (editable
// sin redeploy). Si Supabase no está configurado o falla, cae a los
// estáticos de constants.ts (modo demo / offline).
// SOLO server-side (usa el cliente admin).
// ─────────────────────────────────────────────────────────────
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/supabase/admin";
import { seasonalityOptionsFor, specialDatesOptionsFor } from "@/lib/constants";

type Kind = "seasonality" | "special_date";

const cache = new Map<string, { at: number; data: string[] }>();
const TTL_MS = 5 * 60_000;

async function fetchCatalog(industry: string, kind: Kind): Promise<string[] | null> {
  if (!hasSupabaseAdminConfig()) return null;
  const key = `${industry}:${kind}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;

  const { data, error } = await getSupabaseAdmin()
    .from("special_dates_catalog")
    .select("industry, label, sort_order")
    .in("industry", [industry, "__default__"])
    .eq("kind", kind)
    .order("sort_order");
  if (error || !data) return null;

  // Curadas de la industria primero, genéricas ("__default__") después
  // (mismo orden que seasonalityOptionsFor/specialDatesOptionsFor).
  const specific = data.filter((r) => r.industry === industry).map((r) => r.label as string);
  const generic = data.filter((r) => r.industry === "__default__").map((r) => r.label as string);
  const labels = [...specific, ...generic];
  cache.set(key, { at: Date.now(), data: labels });
  return labels;
}

export async function getSeasonalityOptions(industry: string): Promise<string[]> {
  return (await fetchCatalog(industry, "seasonality")) ?? seasonalityOptionsFor(industry);
}

export async function getSpecialDatesOptions(industry: string): Promise<string[]> {
  return (await fetchCatalog(industry, "special_date")) ?? specialDatesOptionsFor(industry);
}
