import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/admin";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 404 (no 403) para no-admins: no confirmamos que la ruta existe.
const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

const LIST_COLUMNS =
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
    return NextResponse.json({ row: data });
  }

  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 50, 200);
  const offset = Math.max(Number(req.nextUrl.searchParams.get("offset")) || 0, 0);
  const { data, error, count } = await supabase
    .from("website_analysis_log")
    .select(LIST_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) {
    // Migración 0011 sin correr: lista vacía con aviso, no un error críptico.
    if (/website_analysis_log/.test(error.message)) {
      return NextResponse.json({ rows: [], total: 0, migrationPending: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ rows: data ?? [], total: count ?? 0 });
}
