// ─────────────────────────────────────────────────────────────
// Validación amable del onboarding por paso.
// Devuelve los campos faltantes (con label + id para scrollear/marcar),
// nunca errores técnicos.
// ─────────────────────────────────────────────────────────────
import type { Business } from "./types";

export interface MissingField {
  id: string; // id del campo para hacer scroll/foco
  label: string; // texto humano
}

function isEmpty(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

/**
 * Índices de paso del onboarding (los pasos 0 "web", 3 "identidad visual"
 * y 7 "resumen" no validan campos requeridos).
 * 1 Negocio · 2 Marca · 4 Productos · 5 Audiencia · 6 Objetivos
 */
export function getMissingRequiredFields(step: number, b: Business): MissingField[] {
  const missing: MissingField[] = [];
  const need = (cond: boolean, id: string, label: string) => {
    if (cond) missing.push({ id, label });
  };

  if (step === 1) {
    need(isEmpty(b.name), "name", "Nombre de la empresa");
    need(isEmpty(b.industry), "industry", "Industria");
    need(isEmpty(b.subcategory), "subcategory", "Subcategoría");
    need(isEmpty(b.businessType), "businessType", "Tipo de negocio");
    need(isEmpty(b.yearFounded), "yearFounded", "Año de fundación");
    need(isEmpty(b.employees), "employees", "Cantidad de empleados");
    need(isEmpty(b.country), "country", "País");
    need(isEmpty(b.state), "state", "Provincia / Estado");
    need(isEmpty(b.city), "city", "Ciudad");
  }

  if (step === 2) {
    need(isEmpty(b.shortDescription), "shortDescription", "Descripción corta");
    need(isEmpty(b.fullDescription), "fullDescription", "Descripción completa");
    need(isEmpty(b.values), "values", "Valores de marca");
    need(isEmpty(b.competitiveAdvantages), "competitiveAdvantages", "Ventaja competitiva");
    need(isEmpty(b.marketingChannels), "marketingChannels", "Canales actuales");
    need(isEmpty(b.marketingActivities), "marketingActivities", "Qué venís haciendo de marketing");
    need(b.hasSeasonality === undefined, "hasSeasonality", "¿Tenés temporadas fuertes?");
    need(!!b.hasSeasonality && isEmpty(b.seasonalityTags), "hasSeasonality", "Elegí tus temporadas fuertes");
    need(b.hasSpecialDates === undefined, "hasSpecialDates", "¿Hay fechas especiales?");
    need(!!b.hasSpecialDates && isEmpty(b.specialDates), "hasSpecialDates", "Elegí tus fechas especiales");
  }

  // Paso 3: Identidad visual (Brand Kit)
  if (step === 3) {
    const bk = b.brandKit;
    need(!bk?.colors?.primary && !bk?.colors?.palette?.some((c) => c.role === "primary"), "bk_color", "Color principal");
    need(!bk?.typography?.heading?.family && !bk?.typography?.body?.family, "bk_font", "Tipografía (títulos o texto)");
    need(isEmpty(bk?.voiceTone?.toneTags), "bk_tone", "Tono visual / de voz");
  }

  if (step === 4) {
    const saved = b.productsServices.filter((p) => p.saved && p.name.trim());
    need(saved.length === 0, "products", "Al menos un producto o servicio guardado");
    b.productsServices.forEach((p, i) => {
      need(isEmpty(p.name), `product_${i}`, `Nombre del ${p.type} #${i + 1}`);
    });
  }

  if (step === 5) {
    const a = b.audience;
    need(isEmpty(a.ageRanges), "ageRanges", "Rango de edad");
    need(isEmpty(a.locations), "locations", "Ubicaciones objetivo");
    need(isEmpty(a.painPoints), "painPoints", "Qué problema le resolvés");
    need(isEmpty(a.behavior), "behavior", "Comportamiento del cliente");
    need(isEmpty(a.segments), "segments", "Segmentos de audiencia");
  }

  if (step === 6) {
    const g = b.goals;
    need(isEmpty(g.primaryContentGoal), "primaryContentGoal", "Objetivo principal");
    need(g.primaryContentGoal === "ventas" && isEmpty(g.salesGoalType), "primaryContentGoal", "Tipo de venta");
    need(isEmpty(g.businessObjectives), "businessObjectives", "Objetivos de negocio");
    need(isEmpty(g.successMetrics), "successMetrics", "Métricas de éxito");
    need(isEmpty(g.marketingObjectives), "marketingObjectives", "Objetivos de marketing");
    need(isEmpty(g.timeline), "timeline", "Plazo (timeline)");
  }

  return missing;
}

export function validateOnboardingStep(step: number, b: Business): boolean {
  return getMissingRequiredFields(step, b).length === 0;
}
