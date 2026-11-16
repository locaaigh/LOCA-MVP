import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/supabase/admin";
import { QUESTIONS } from "@/lib/business-questions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cierre del funnel del análisis: al terminar el onboarding, el cliente avisa
// qué campos (que la IA no había podido completar) terminó completando el
// usuario a mano. Público porque el onboarding corre anónimo, pero acotado:
// solo acepta ids de preguntas conocidas, solo actualiza la fila del log cuyo
// business_id coincide, y siempre responde 204 (nunca molesta al onboarding).
export async function POST(req: NextRequest) {
  try {
    if (!hasSupabaseAdminConfig()) return new NextResponse(null, { status: 204 });
    const raw = await req.text();
    if (raw.length > 10_000) return new NextResponse(null, { status: 204 });
    const body = JSON.parse(raw) as { businessId?: string; completed?: string[] };
    const businessId = typeof body.businessId === "string" ? body.businessId.slice(0, 64) : "";
    if (!businessId || !Array.isArray(body.completed)) return new NextResponse(null, { status: 204 });

    const completed = body.completed
      .slice(0, 50)
      .map((id) => QUESTIONS.find((q) => q.id === id))
      .filter((q): q is (typeof QUESTIONS)[number] => !!q)
      .map((q) => ({ id: q.id, label: q.label }));
    if (!completed.length) return new NextResponse(null, { status: 204 });

    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("website_analysis_log")
      .select("id")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return new NextResponse(null, { status: 204 });

    await supabase
      .from("website_analysis_log")
      .update({ user_completed: completed, user_completed_at: new Date().toISOString() })
      .eq("id", data.id);
  } catch {
    // Silencioso: auditoría, no flujo.
  }
  return new NextResponse(null, { status: 204 });
}
