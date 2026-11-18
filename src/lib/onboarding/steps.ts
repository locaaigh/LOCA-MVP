// ─────────────────────────────────────────────────────────────
// Pasos del formulario manual. La pantalla inicial (elección de método) es
// una fase aparte, no un paso: por eso el wizard arranca en 1.
// ─────────────────────────────────────────────────────────────
export const STEP_LABELS = [
  "Negocio",
  "Marca",
  "Identidad visual",
  "Productos / Servicios",
  "Audiencia",
  "Objetivos",
  "Dónde publicar",
  "Resumen",
];
/** Pasos reales del formulario (1..7); el 8 es el Resumen. */
export const WIZARD_TOTAL = 7;
export const SUMMARY_STEP = 8;
export const CURRENT_YEAR = 2026;

/** Nombre del paso (1-indexado). */
export function stepLabel(step: number): string {
  return STEP_LABELS[step - 1] ?? "";
}

// Fases del onboarding: "select" (elección de método) → "web" / "ai" (pantallas
// únicas) → "pending" (faltantes) → "wizard" (formulario manual + resumen).
export type Phase = "select" | "web" | "ai" | "pending" | "wizard";
