// ─────────────────────────────────────────────────────────────
// Validación amable del onboarding por paso.
// Devuelve los campos faltantes (con label + id para scrollear/marcar),
// nunca errores técnicos.
//
// Los campos obligatorios se declaran una sola vez en field-requirements.ts
// (fuente única de verdad). Acá solo derivamos la vista "por paso" y sumamos
// el detalle dinámico (nombre de cada producto cargado), que no es estático.
// ─────────────────────────────────────────────────────────────
import type { Business } from "./types";
import { requirementsForStep } from "./onboarding/field-requirements";

export interface MissingField {
  id: string; // id del campo para hacer scroll/foco
  label: string; // texto humano
}

/**
 * Índices de paso del onboarding (los pasos 0 "web" y 8 "resumen" no validan).
 * 1 Negocio · 2 Marca · 3 Identidad visual · 4 Productos · 5 Audiencia ·
 * 6 Objetivos · 7 Dónde publicar
 */
export function getMissingRequiredFields(step: number, b: Business): MissingField[] {
  const missing: MissingField[] = requirementsForStep(step)
    .filter((f) => f.isMissing(b))
    .map((f) => ({ id: f.id, label: f.label }));

  // Detalle dinámico del paso 4: nombre de cada ítem y confirmación de los
  // sugeridos por Eva (shouldReview) — para que "Revisar" no sea invisible.
  if (step === 4) {
    b.productsServices.forEach((p, i) => {
      if (!p.name || p.name.trim() === "") {
        missing.push({ id: `product_${i}`, label: `Nombre del ${p.type} #${i + 1}` });
      } else if (p.saved && p.shouldReview) {
        missing.push({ id: "products", label: `Revisá "${p.name}" (sugerido por Eva)` });
      }
    });
  }

  return missing;
}

export function validateOnboardingStep(step: number, b: Business): boolean {
  return getMissingRequiredFields(step, b).length === 0;
}
