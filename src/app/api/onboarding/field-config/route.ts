import { NextResponse } from "next/server";
import { getFieldConfigOverrides } from "@/lib/onboarding/field-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Ruta pública (sin auth): el onboarding corre anónimo y la config de
// obligatoriedad no es información sensible. No expone quién editó qué.
export async function GET() {
  const rows = await getFieldConfigOverrides();
  return NextResponse.json({
    overrides: rows.map((r) => ({
      fieldId: r.fieldId,
      required: r.required,
      critical: r.critical,
      sortOrder: r.sortOrder,
      label: r.label,
      placeholder: r.placeholder,
      why: r.why,
    })),
  });
}
