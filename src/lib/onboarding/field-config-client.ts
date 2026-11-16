// ─────────────────────────────────────────────────────────────
// Lado cliente de la config de campos: baja los overrides del backoffice
// y los aplica al registro en memoria. Si no hay Supabase o la API falla,
// no pasa nada: quedan los defaults de código (mismo criterio que el
// catálogo de fechas especiales).
// ─────────────────────────────────────────────────────────────
import { applyFieldConfigOverrides, type FieldFlagsOverride } from "@/lib/business-questions";

let inflight: Promise<void> | null = null;
let done = false;

/**
 * Sincroniza los overrides. Con `force` SIEMPRE refetchea (lo usa el
 * onboarding justo antes de decidir qué campos pedir: si el admin tocó un
 * toggle hace un minuto, acá tiene que verse). Sin `force`, una vez por
 * sesión de página. Devuelve una promesa para poder esperarla.
 */
export function syncFieldConfigOverrides(force = false): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!force && (done || inflight)) return inflight ?? Promise.resolve();
  inflight = fetch("/api/onboarding/field-config", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((json: { overrides?: FieldFlagsOverride[] } | null) => {
      if (json?.overrides) applyFieldConfigOverrides(json.overrides);
      done = true;
    })
    .catch(() => {
      // Silencioso a propósito: sin config remota, los defaults alcanzan.
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
