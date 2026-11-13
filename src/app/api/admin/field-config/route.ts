import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/admin";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getFieldConfigOverrides, invalidateFieldConfigCache } from "@/lib/onboarding/field-config";
import { QUESTIONS, SECTION_LABELS, FLOOR_FIELD_IDS, defaultFlagsOf } from "@/lib/business-questions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 404 (no 403) para no-admins: no confirmamos que la ruta existe.
const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

/** Lista completa para el backoffice: defaults de código + overrides + auditoría. */
export async function GET() {
  const session = await getAdminSession();
  if (!session) return notFound();

  const overrides = new Map((await getFieldConfigOverrides(true)).map((r) => [r.fieldId, r]));
  const fields = QUESTIONS.map((q) => {
    const d = defaultFlagsOf(q.id)!;
    const o = overrides.get(q.id);
    return {
      fieldId: q.id,
      label: q.label,
      section: SECTION_LABELS[q.section],
      floor: FLOOR_FIELD_IDS.has(q.id),
      defaultRequired: d.required,
      defaultCritical: d.critical,
      required: o ? o.required : d.required,
      critical: o ? o.critical : d.critical,
      overridden: !!o,
      updatedByEmail: o?.updatedByEmail ?? null,
      updatedAt: o?.updatedAt ?? null,
    };
  });
  return NextResponse.json({ fields });
}

/**
 * Cambia los flags de un campo: { fieldId, required?, critical?, reset? }.
 * Escribe con el cliente de la SESIÓN (no el service role): la policy de RLS
 * de onboarding_field_config es el candado final.
 */
export async function PATCH(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return notFound();

  const body = (await req.json()) as {
    fieldId?: string;
    required?: boolean;
    critical?: boolean;
    reset?: boolean;
  };
  const q = QUESTIONS.find((x) => x.id === body.fieldId);
  if (!q) return NextResponse.json({ error: "Campo desconocido" }, { status: 400 });
  if (FLOOR_FIELD_IDS.has(q.id)) {
    return NextResponse.json(
      { error: "Este campo es parte del piso mínimo: sin él, la estrategia sería de otro negocio." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServer();

  if (body.reset) {
    const { error } = await supabase.from("onboarding_field_config").delete().eq("field_id", q.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    invalidateFieldConfigCache();
    return NextResponse.json({ ok: true });
  }

  // Flags efectivos = override actual (o default) + lo que pide el cambio.
  const d = defaultFlagsOf(q.id)!;
  const current = (await getFieldConfigOverrides(true)).find((r) => r.fieldId === q.id);
  const next = {
    required: body.required ?? current?.required ?? d.required,
    critical: body.critical ?? current?.critical ?? d.critical,
  };
  // Invariante crítico ⇒ obligatorio. Prender crítico arrastra obligatorio;
  // hacer opcional un crítico se rechaza (primero hay que bajarlo de crítico).
  if (body.critical === true) next.required = true;
  if (next.critical && !next.required) {
    return NextResponse.json(
      { error: "Un campo crítico no puede ser opcional: primero desactivá 'Crítico'." },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("onboarding_field_config").upsert({
    field_id: q.id,
    required: next.required,
    critical: next.critical,
    updated_by: session.userId,
    updated_by_email: session.email,
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  invalidateFieldConfigCache();
  return NextResponse.json({ ok: true, fieldId: q.id, ...next });
}
