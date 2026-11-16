import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/admin";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/supabase/admin";
import { emptyBusiness } from "@/lib/business-defaults";
import {
  QUESTIONS,
  SECTION_LABELS,
  isQuestionRequired,
  applyFieldConfigOverrides,
} from "@/lib/business-questions";
import { getFieldConfigOverrides } from "@/lib/onboarding/field-config";
import { applyAnalysisToBusiness } from "@/lib/onboarding/apply-analysis";
import type { WebsiteAnalysis } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 404 (no 403) para no-admins: no confirmamos que la ruta existe.
const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

function preview(v: unknown): string {
  if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) return "";
  if (typeof v === "string") return v.length > 160 ? `${v.slice(0, 160)}…` : v;
  if (Array.isArray(v)) {
    const s = v
      .map((x) => (typeof x === "string" ? x : (x as { name?: string })?.name || JSON.stringify(x)))
      .join(", ");
    return s.length > 160 ? `${s.slice(0, 160)}…` : s;
  }
  const s = JSON.stringify(v);
  return s.length > 160 ? `${s.slice(0, 160)}…` : s;
}

/**
 * Vista COMPLETA del registro del onboarding para el detalle: se reconstruye
 * el negocio aplicando el snapshot guardado (mismo merge que usa el cliente)
 * y se evalúa CADA pregunta — estado, obligatoriedad (config actual del
 * admin) y el valor que quedó. Computada al leer: sirve también para los
 * registros anteriores a la migración 0012.
 */
async function registryView(row: Record<string, unknown>) {
  try {
    if (!row.found_fields) return null;
    applyFieldConfigOverrides(await getFieldConfigOverrides());
    const analysis = {
      foundFields: row.found_fields,
      fieldStatuses: row.field_statuses || {},
      confidence: Number(row.confidence) || 0,
      mode: (row.mode as string) || "basic",
    } as unknown as WebsiteAnalysis;
    const biz = applyAnalysisToBusiness(emptyBusiness("anon"), analysis);
    return QUESTIONS.map((q) => ({
      id: q.id,
      label: q.label,
      section: SECTION_LABELS[q.section],
      required: isQuestionRequired(q),
      missing: q.isMissing(biz),
      value: preview(q.get(biz)),
    }));
  } catch {
    return null;
  }
}

const LIST_COLUMNS =
  "id, created_at, source, url, file_name, business_id, provider, model, success, mode, confidence, duration_ms, usage, warning, fields_found, fields_suggested, fields_review, fields_missing, onboarding_required_total, onboarding_required_missing, onboarding_missing, user_completed, user_completed_at";
// Esquema base (pre-migraciones 0012/0013): fallback de lectura.
const LIST_COLUMNS_0011 =
  "id, created_at, source, url, file_name, business_id, provider, model, success, mode, confidence, duration_ms, usage, warning, fields_found, fields_suggested, fields_review, fields_missing";

/**
 * Lista del log de análisis de Eva (liviana) o detalle completo con ?id=.
 * Lee con el cliente admin: la tabla tiene RLS sin policies a propósito.
 */
export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return notFound();
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ rows: [] });

  const id = req.nextUrl.searchParams.get("id");
  const supabase = getSupabaseAdmin();

  if (id) {
    const { data, error } = await supabase
      .from("website_analysis_log")
      .select("*")
      .eq("id", Number(id))
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "No existe" }, { status: 404 });
    return NextResponse.json({ row: data, onboardingFields: await registryView(data) });
  }

  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 50, 200);
  const offset = Math.max(Number(req.nextUrl.searchParams.get("offset")) || 0, 0);
  let res = await supabase
    .from("website_analysis_log")
    .select(LIST_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (res.error && /onboarding_|user_completed/.test(res.error.message)) {
    // Migraciones 0012/0013 sin correr: releer con el esquema base.
    res = (await supabase
      .from("website_analysis_log")
      .select(LIST_COLUMNS_0011, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)) as unknown as typeof res;
  }
  const { data, error, count } = res;
  if (error) {
    // Migración 0011 sin correr: lista vacía con aviso, no un error críptico.
    if (/website_analysis_log/.test(error.message)) {
      return NextResponse.json({ rows: [], total: 0, migrationPending: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ rows: data ?? [], total: count ?? 0 });
}
