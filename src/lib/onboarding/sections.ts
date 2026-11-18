// ─────────────────────────────────────────────────────────────
// Secciones del onboarding: ÚNICO lugar donde una sección de preguntas se
// relaciona con las pantallas que la muestran. Antes estos dos mapas vivían
// dispersos (page.tsx y pending-flow.tsx).
// ─────────────────────────────────────────────────────────────
import type { QSection } from "@/lib/business-questions";

/** Claves de las secciones editables del resumen final (modal por sección). */
export type SummarySectionKey =
  | "basicos"
  | "productos"
  | "audiencia"
  | "propuesta"
  | "canales"
  | "objetivos"
  | "brandkit"
  | "comerciales"
  | "keywords";

/**
 * Paso del wizard con el que se presenta cada sección en "Completá lo que
 * falta" (mismos pasos del formulario: Negocio, Marca, Identidad visual…).
 */
export const PENDING_STEP_OF_SECTION: Record<QSection, number> = {
  basicos: 1,
  propuesta: 2,
  canales: 2,
  agenda: 2,
  fechas: 2,
  brandkit: 3,
  restricciones: 3,
  productos: 4,
  audiencia: 5,
  objetivos: 6,
  necesidades: 6,
};

/** Sección de preguntas → sección editable del resumen ("Editar sección completa"). */
export const SUMMARY_KEY_OF_SECTION: Record<QSection, SummarySectionKey> = {
  basicos: "basicos",
  productos: "productos",
  audiencia: "audiencia",
  propuesta: "propuesta",
  canales: "canales",
  objetivos: "objetivos",
  brandkit: "brandkit",
  agenda: "canales",
  fechas: "canales",
  restricciones: "keywords",
  necesidades: "comerciales",
};
