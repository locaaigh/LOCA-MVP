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
 * Índices de paso del onboarding (el paso 0 "web" es opcional, no valida).
 * 1 Negocio · 2 Marca · 3 Productos · 4 Audiencia · 5 Objetivos
 */
export function getMissingRequiredFields(step: number, b: Business): MissingField[] {
  const missing: MissingField[] = [];
  const need = (cond: boolean, id: string, label: string) => {
    if (cond) missing.push({ id, label });
  };

  if (step === 1) {
    need(isEmpty(b.name), "name", "Nombre de la empresa");
    need(isEmpty(b.industry), "industry", "Industria");
    need(isEmpty(b.businessType), "businessType", "Tipo de negocio");
    need(isEmpty(b.country), "country", "País");
  }

  if (step === 2) {
    need(isEmpty(b.shortDescription), "shortDescription", "Descripción corta");
    need(isEmpty(b.competitiveAdvantages), "competitiveAdvantages", "Ventaja competitiva");
    need(isEmpty(b.marketingChannels), "marketingChannels", "Canales actuales");
    need(isEmpty(b.marketingActivities), "marketingActivities", "Qué venís haciendo de marketing");
    need(b.hasSeasonality === undefined, "hasSeasonality", "¿Tenés temporadas fuertes?");
    need(b.hasSpecialDates === undefined, "hasSpecialDates", "¿Hay fechas especiales?");
  }

  if (step === 3) {
    need(isEmpty(b.productsServices), "products", "Al menos un producto o servicio");
    // todos los productos cargados deben tener nombre
    b.productsServices.forEach((p, i) => {
      need(isEmpty(p.name), `product_${i}`, `Nombre del ${p.type} #${i + 1}`);
    });
  }

  if (step === 4) {
    need(isEmpty(b.audience.ageRanges), "ageRanges", "Rango de edad");
  }

  if (step === 5) {
    need(isEmpty(b.goals.primaryContentGoal), "primaryContentGoal", "Objetivo principal");
    need(isEmpty(b.goals.timeline), "timeline", "Plazo (timeline)");
  }

  return missing;
}

export function validateOnboardingStep(step: number, b: Business): boolean {
  return getMissingRequiredFields(step, b).length === 0;
}
