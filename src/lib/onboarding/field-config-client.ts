// ─────────────────────────────────────────────────────────────
// Lado cliente de la config de campos: baja los overrides del backoffice
// (una vez por sesión de página) y los aplica al registro en memoria.
// Si no hay Supabase o la API falla, no pasa nada: quedan los defaults de
// código (mismo criterio que el catálogo de fechas especiales).
// ─────────────────────────────────────────────────────────────
import { applyFieldConfigOverrides, type FieldFlagsOverride } from "@/lib/business-questions";

let fetched = false;

export function syncFieldConfigOverrides(): void {
  if (fetched || typeof window === "undefined") return;
  fetched = true;
  fetch("/api/onboarding/field-config")
    .then((r) => (r.ok ? r.json() : null))
    .then((json: { overrides?: FieldFlagsOverride[] } | null) => {
      if (json?.overrides?.length) applyFieldConfigOverrides(json.overrides);
    })
    .catch(() => {
      // Silencioso a propósito: sin config remota, los defaults alcanzan.
    });
}
