// ─────────────────────────────────────────────────────────────
// Layout del FORMULARIO MANUAL: qué campos muestra cada paso (en el orden en
// que aparecen en pantalla) y la validación por paso. Los campos son las
// preguntas del registro (business-questions.ts); acá solo vive su posición
// en el wizard. Los ids son los de DOM del formulario (`wizard.domId` cuando
// difiere del id lógico), que es lo que se usa para scroll/foco.
// ─────────────────────────────────────────────────────────────
import type { Business } from "@/lib/types";
import { QUESTIONS, isQuestionRequired, defaultTextsOf, type BusinessQuestion } from "@/lib/business-questions";

/** Campos por paso (1 Negocio · 2 Marca · 3 Identidad visual · 4 Productos · 5 Audiencia · 6 Objetivos · 7 Dónde publicar). */
export const WIZARD_STEP_FIELDS: Record<number, string[]> = {
  1: ["name", "industry", "subcategory", "businessType", "businessModel", "businessStage", "yearFounded", "employees", "country", "state", "city"],
  2: ["shortDescription", "fullDescription", "values", "competitiveAdvantages", "marketingChannels", "marketingActivities", "hasSeasonality", "hasSpecialDates"],
  3: ["bk_color", "bk_font", "bk_tone", "personPhotos"],
  4: ["products"],
  5: ["ageRanges", "locations", "painPoints", "behavior", "segments"],
  6: ["primaryContentGoal", "businessObjectives", "successMetrics", "marketingObjectives", "timeline"],
  7: ["publishChannels"],
};

export interface WizardField {
  /** id de DOM del input (para scroll/foco y para `isFieldRequired`). */
  id: string;
  label: string;
  critical: boolean;
  isMissing: (b: Business) => boolean;
  question: BusinessQuestion;
}

const BY_DOM_ID = new Map<string, BusinessQuestion>(
  QUESTIONS.map((q) => [q.wizard?.domId ?? q.id, q])
);

/** Pregunta del registro que corresponde a un id de DOM del formulario. */
export function questionByDomId(domId: string): BusinessQuestion | undefined {
  return BY_DOM_ID.get(domId);
}

function toWizardField(q: BusinessQuestion): WizardField {
  return {
    id: q.wizard?.domId ?? q.id,
    label: q.wizard?.label ?? q.label,
    critical: q.critical,
    isMissing: q.wizard?.isMissing ?? q.isMissing,
    question: q,
  };
}

/**
 * ¿Este campo del formulario es obligatorio? Respeta el flag `required` que
 * los admins editan en /admin (misma definición que el flujo con IA). Lo usan
 * los asteriscos de HelpField y la validación por paso.
 */
export function isFieldRequired(domId: string): boolean {
  const q = questionByDomId(domId);
  return q ? isQuestionRequired(q) : true;
}

/** Campos obligatorios de un paso, en el orden en que aparecen en pantalla. */
export function requirementsForStep(step: number): WizardField[] {
  return (WIZARD_STEP_FIELDS[step] ?? [])
    .map(questionByDomId)
    .filter((q): q is BusinessQuestion => !!q && isQuestionRequired(q))
    .map(toWizardField);
}

/**
 * Textos que muestra el FORMULARIO para un campo. Por defecto son los del
 * propio formulario (`wizard.heading` / `wizard.help`, que pueden diferir del
 * label lógico: el wizard pregunta, el registro nombra). Si el admin editó el
 * texto en /admin (difiere del default de código), el editado gana en todos
 * lados — ese es el objetivo: una sola edición aplica al flujo con IA y al
 * formulario manual.
 */
export function wizardTexts(domId: string): { label: string; help?: string; placeholder?: string } {
  const q = questionByDomId(domId);
  if (!q) return { label: domId };
  const d = defaultTextsOf(q.id);
  const labelEdited = !!d && q.label !== d.label;
  const whyEdited = !!d && q.why !== d.why;
  const placeholderEdited = !!d && q.placeholder !== d.placeholder;
  return {
    label: labelEdited ? q.label : (q.wizard?.heading ?? q.wizard?.label ?? q.label),
    help: whyEdited ? q.why : q.wizard?.help,
    placeholder: placeholderEdited ? q.placeholder : undefined,
  };
}
