import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/admin";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getFieldConfigOverrides, invalidateFieldConfigCache } from "@/lib/onboarding/field-config";
import {
  QUESTIONS,
  SECTION_LABELS,
  FLOOR_FIELD_IDS,
  defaultFlagsOf,
  defaultTextsOf,
  sortKeyOf,
} from "@/lib/business-questions";

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
    const t = defaultTextsOf(q.id)!;
    const o = overrides.get(q.id);
    return {
      fieldId: q.id,
      section: SECTION_LABELS[q.section],
      floor: FLOOR_FIELD_IDS.has(q.id),
      defaultRequired: d.required,
      defaultCritical: d.critical,
      required: o ? o.required : d.required,
      critical: o ? o.critical : d.critical,
      // Textos: efectivo + default (la UI muestra el efectivo y permite volver).
      label: o?.label || t.label,
      placeholder: o?.placeholder || t.placeholder || "",
      why: o?.why || t.why,
      defaultLabel: t.label,
      defaultPlaceholder: t.placeholder || "",
      defaultWhy: t.why,
      // Orden efectivo (para reordenar con flechas: se intercambian sortKeys).
      sortKey: sortKeyOf(q.id, o?.sortOrder),
      overridden: !!o,
      updatedByEmail: o?.updatedByEmail ?? null,
      updatedAt: o?.updatedAt ?? null,
    };
  }).sort((a, b) => a.sortKey - b.sortKey);
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
    sortOrder?: number | null;
    label?: string | null;
    placeholder?: string | null;
    why?: string | null;
    reset?: boolean;
  };
  const q = QUESTIONS.find((x) => x.id === body.fieldId);
  if (!q) return NextResponse.json({ error: "Campo desconocido" }, { status: 400 });
  // El piso mínimo no permite tocar flags; sus textos/orden sí se editan
  // (y reset solo borra el override, que para el piso nunca afecta flags).
  const touchesFlags = typeof body.required === "boolean" || typeof body.critical === "boolean";
  if (FLOOR_FIELD_IDS.has(q.id) && touchesFlags) {
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

  // Estado efectivo = override actual (o default) + lo que pide el cambio.
  // Textos: string no vacío = override; "" o null = volver al default (null en DB).
  const d = defaultFlagsOf(q.id)!;
  const current = (await getFieldConfigOverrides(true)).find((r) => r.fieldId === q.id);
  const text = (key: "label" | "placeholder" | "why"): string | null => {
    if (key in body) return (body[key] || "").trim() || null;
    return current?.[key] ?? null;
  };
  const next = {
    required: body.required ?? current?.required ?? d.required,
    critical: body.critical ?? current?.critical ?? d.critical,
    sort_order: "sortOrder" in body ? body.sortOrder ?? null : current?.sortOrder ?? null,
    label: text("label"),
    placeholder: text("placeholder"),
    why: text("why"),
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
    ...next,
    updated_by: session.userId,
    updated_by_email: session.email,
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  invalidateFieldConfigCache();
  return NextResponse.json({ ok: true, fieldId: q.id });
}
