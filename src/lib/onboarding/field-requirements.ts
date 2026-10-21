// ─────────────────────────────────────────────────────────────
// FUENTE ÚNICA DE VERDAD de los campos OBLIGATORIOS del onboarding.
//
// Antes esto vivía duplicado en dos lugares que podían divergir:
//   - onboarding-validation.ts (requeridos por paso, para avanzar el wizard)
//   - business-questions.ts    (críticos, para el gate de estrategia)
// Al estar en un solo registro declarativo, "qué es obligatorio" y "qué es
// crítico" se definen una sola vez. Ambos sistemas derivan de acá.
//
// - `required` (bloquea el paso del wizard) = estar en este registro con `step`.
// - `critical` (subconjunto que además bloquea la estrategia / alimenta el
//   flujo de pendientes 1-de-N y la completitud del perfil).
//
// Los campos dinámicos (ej: el nombre de cada producto cargado) NO se listan
// acá porque no son estáticos; se chequean aparte en getMissingRequiredFields.
// ─────────────────────────────────────────────────────────────
import type { Business } from "../types";

export interface FieldRequirement {
  /** id del campo = ancla de scroll/foco en el wizard. */
  id: string;
  /** texto humano (nunca un error técnico). */
  label: string;
  /** paso del wizard al que pertenece (para rutear al primer incompleto). */
  step: number;
  /** subconjunto que bloquea la estrategia y alimenta pendientes/completitud. */
  critical: boolean;
  /** true si el campo está sin completar. */
  isMissing: (b: Business) => boolean;
}

function isEmpty(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

export const FIELD_REQUIREMENTS: FieldRequirement[] = [
  // ── Paso 1: Negocio ──────────────────────────────────────────
  { id: "name", label: "Nombre de la empresa", step: 1, critical: true, isMissing: (b) => isEmpty(b.name) },
  { id: "industry", label: "Industria", step: 1, critical: true, isMissing: (b) => isEmpty(b.industry) },
  { id: "subcategory", label: "Subcategoría", step: 1, critical: true, isMissing: (b) => isEmpty(b.subcategory) },
  { id: "businessType", label: "Tipo de negocio", step: 1, critical: true, isMissing: (b) => isEmpty(b.businessType) },
  { id: "businessStage", label: "Tipo de organización", step: 1, critical: false, isMissing: (b) => isEmpty(b.businessStage) },
  { id: "yearFounded", label: "Año de fundación", step: 1, critical: false, isMissing: (b) => isEmpty(b.yearFounded) },
  { id: "employees", label: "Cantidad de empleados", step: 1, critical: false, isMissing: (b) => isEmpty(b.employees) },
  { id: "country", label: "País", step: 1, critical: true, isMissing: (b) => isEmpty(b.country) },
  { id: "state", label: "Provincia / Estado", step: 1, critical: false, isMissing: (b) => isEmpty(b.state) },
  { id: "city", label: "Ciudad", step: 1, critical: false, isMissing: (b) => isEmpty(b.city) },

  // ── Paso 2: Marca ────────────────────────────────────────────
  { id: "shortDescription", label: "Descripción corta", step: 2, critical: true, isMissing: (b) => isEmpty(b.shortDescription) },
  { id: "fullDescription", label: "Descripción completa", step: 2, critical: false, isMissing: (b) => isEmpty(b.fullDescription) },
  { id: "values", label: "Valores de marca", step: 2, critical: false, isMissing: (b) => isEmpty(b.values) },
  { id: "competitiveAdvantages", label: "Ventaja competitiva", step: 2, critical: true, isMissing: (b) => isEmpty(b.competitiveAdvantages) },
  { id: "marketingChannels", label: "Canales actuales", step: 2, critical: true, isMissing: (b) => isEmpty(b.marketingChannels) },
  { id: "marketingActivities", label: "Qué venís haciendo de marketing", step: 2, critical: false, isMissing: (b) => isEmpty(b.marketingActivities) },
  {
    id: "hasSeasonality",
    label: "¿Tenés temporadas fuertes?",
    step: 2,
    critical: false,
    // Debe estar respondido; y si dijo que sí, elegir al menos una.
    isMissing: (b) => b.hasSeasonality === undefined || (!!b.hasSeasonality && isEmpty(b.seasonalityTags)),
  },
  {
    id: "hasSpecialDates",
    label: "¿Hay fechas especiales?",
    step: 2,
    critical: false,
    isMissing: (b) => b.hasSpecialDates === undefined || (!!b.hasSpecialDates && isEmpty(b.specialDates)),
  },

  // ── Paso 3: Identidad visual (Brand Kit) ─────────────────────
  {
    id: "bk_color",
    label: "Un color de marca",
    step: 3,
    critical: false,
    isMissing: (b) => !(!!b.brandKit?.colors?.primary || (b.brandKit?.colors?.palette?.length ?? 0) > 0),
  },
  {
    id: "bk_font",
    label: "Una tipografía (títulos o texto)",
    step: 3,
    critical: false,
    isMissing: (b) => !(!!b.brandKit?.typography?.heading?.family || !!b.brandKit?.typography?.body?.family),
  },
  {
    id: "bk_tone",
    label: "Tono o estilo de marca",
    step: 3,
    critical: true,
    isMissing: (b) => isEmpty(b.brandKit?.voiceTone?.toneTags) && isEmpty(b.brandKit?.visualStyle?.mood),
  },
  {
    id: "personPhotos",
    label: "Al menos una foto tuya",
    step: 3,
    critical: false,
    // Solo aplica a marca personal / profesional independiente.
    isMissing: (b) =>
      (b.businessStage === "profesional_independiente" || b.businessType === "Marca personal") &&
      isEmpty(b.personPhotos),
  },

  // ── Paso 4: Productos / Servicios ────────────────────────────
  // El detalle por ítem (nombre de cada producto) se valida aparte por ser dinámico.
  {
    id: "products",
    label: "Al menos un producto o servicio guardado",
    step: 4,
    critical: true,
    // Obligatorio tener uno; y los sugeridos por Eva deben confirmarse
    // (shouldReview) — si no, "Revisar" sería invisible (feedback form, ítem 11).
    isMissing: (b) =>
      b.productsServices.filter((p) => p.saved && p.name.trim()).length === 0 ||
      b.productsServices.some((p) => p.saved && p.shouldReview),
  },

  // ── Paso 5: Audiencia ────────────────────────────────────────
  { id: "ageRanges", label: "Rango de edad", step: 5, critical: true, isMissing: (b) => isEmpty(b.audience.ageRanges) },
  { id: "locations", label: "Ubicaciones objetivo", step: 5, critical: false, isMissing: (b) => isEmpty(b.audience.locations) },
  { id: "painPoints", label: "Qué problema le resolvés", step: 5, critical: false, isMissing: (b) => isEmpty(b.audience.painPoints) },
  { id: "behavior", label: "Comportamiento del cliente", step: 5, critical: false, isMissing: (b) => isEmpty(b.audience.behavior) },
  { id: "segments", label: "Segmentos de audiencia", step: 5, critical: false, isMissing: (b) => isEmpty(b.audience.segments) },

  // ── Paso 6: Objetivos ────────────────────────────────────────
  {
    id: "primaryContentGoal",
    label: "Objetivo principal",
    step: 6,
    critical: true,
    // Debe estar elegido; y si es "ventas", definir el tipo de venta.
    isMissing: (b) =>
      isEmpty(b.goals.primaryContentGoal) ||
      (b.goals.primaryContentGoal === "ventas" && isEmpty(b.goals.salesGoalType)),
  },
  { id: "businessObjectives", label: "Objetivos de negocio", step: 6, critical: false, isMissing: (b) => isEmpty(b.goals.businessObjectives) },
  { id: "successMetrics", label: "Métricas de éxito", step: 6, critical: false, isMissing: (b) => isEmpty(b.goals.successMetrics) },
  { id: "marketingObjectives", label: "Objetivos de marketing", step: 6, critical: false, isMissing: (b) => isEmpty(b.goals.marketingObjectives) },
  { id: "timeline", label: "Plazo (timeline)", step: 6, critical: false, isMissing: (b) => isEmpty(b.goals.timeline) },

  // ── Paso 7: Dónde publicar ───────────────────────────────────
  { id: "publishChannels", label: "Al menos una cuenta donde publicar", step: 7, critical: false, isMissing: (b) => isEmpty(b.publishChannels) },
];

/** Índice por id (lookup O(1)). */
const BY_ID = new Map(FIELD_REQUIREMENTS.map((f) => [f.id, f]));

/** true si el id está declarado como crítico en el registro. */
export function isCriticalField(id: string): boolean {
  return BY_ID.get(id)?.critical ?? false;
}

/** Requeridos de un paso del wizard. */
export function requirementsForStep(step: number): FieldRequirement[] {
  return FIELD_REQUIREMENTS.filter((f) => f.step === step);
}

/**
 * Todos los campos requeridos sin resolver, con su paso.
 * El caso "Revisar" que importa (productos sugeridos por Eva) está codificado
 * en el propio isMissing de `products` (shouldReview), así que deja de ser
 * invisible sin arriesgar trabar selects por un estado de campo genérico.
 * (Feedback formulario, ítem 11.)
 */
export function missingRequired(b: Business): FieldRequirement[] {
  return FIELD_REQUIREMENTS.filter((f) => f.isMissing(b));
}

/** Primer paso del wizard con algún requerido sin resolver (o null si está todo). */
export function firstIncompleteStep(b: Business): number | null {
  const steps = missingRequired(b).map((f) => f.step);
  return steps.length ? Math.min(...steps) : null;
}
