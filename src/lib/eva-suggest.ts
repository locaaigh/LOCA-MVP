// ─────────────────────────────────────────────────────────────
// "Completar pendientes con Eva": sugiere valores razonables para
// campos faltantes, SIN inventar datos sensibles (precio, ubicación,
// nombre comercial, razón social, datos legales). Todo lo sugerido
// queda marcado como "suggested" para que el usuario lo revise.
// ─────────────────────────────────────────────────────────────
import type { Business, FieldStatus } from "./types";
import { getFieldExample } from "./examples";
import { suggestBrandKit } from "./brand-suggest";
import { SUBCATEGORIES } from "./constants";

export interface SuggestResult {
  patch: Partial<Business>;
  statuses: Record<string, FieldStatus>;
  // Campos que NO se pudieron sugerir sin inventar (quedan pendientes)
  stillMissing: string[];
}

const SUGGESTED: FieldStatus = { status: "suggested", confidence: "medium", source: "eva" };

export function suggestPending(b: Business): SuggestResult {
  const patch: Partial<Business> = {};
  const statuses: Record<string, FieldStatus> = {};
  const stillMissing: string[] = [];
  const empty = (v: any) => v == null || v === "" || (Array.isArray(v) && v.length === 0);

  const ind = b.industry;

  // Descripciones
  if (empty(b.shortDescription)) {
    patch.shortDescription = getFieldExample("shortDescription", ind);
    statuses.shortDescription = SUGGESTED;
  }
  if (empty(b.fullDescription)) {
    patch.fullDescription = getFieldExample("fullDescription", ind);
    statuses.fullDescription = SUGGESTED;
  }
  // Subcategoría (solo si la industria tiene opciones conocidas)
  if (empty(b.subcategory) && SUBCATEGORIES[ind]?.length) {
    patch.subcategory = SUBCATEGORIES[ind][0];
    statuses.subcategory = SUGGESTED;
  }
  // Tipo de negocio (inferencia razonable por industria)
  if (empty(b.businessType)) {
    patch.businessType = /e-commerce|online/i.test(ind) ? "Online" : "Local físico";
    statuses.businessType = SUGGESTED;
  }
  // Valores y ventajas
  if (empty(b.values)) {
    patch.values = ["Calidad", "Cercanía"];
    statuses.values = SUGGESTED;
  }
  if (empty(b.competitiveAdvantages)) {
    patch.competitiveAdvantages = ["Atención personalizada", "Calidad"];
    statuses.competitiveAdvantages = SUGGESTED;
  }
  // Marketing actual / canales
  if (empty(b.marketingActivities)) {
    patch.marketingActivities = ["Redes orgánicas"];
    statuses.marketingActivities = SUGGESTED;
  }
  if (empty(b.marketingChannels)) {
    patch.marketingChannels = ["Instagram"];
    statuses.marketingChannels = SUGGESTED;
  }
  // Estacionalidad / fechas → "No" es respuesta válida
  if (b.hasSeasonality === undefined) {
    patch.hasSeasonality = false;
    statuses.hasSeasonality = SUGGESTED;
  }
  if (b.hasSpecialDates === undefined) {
    patch.hasSpecialDates = false;
    statuses.hasSpecialDates = SUGGESTED;
  }

  // Audiencia
  const a = b.audience;
  const audiencePatch = { ...a };
  let audienceChanged = false;
  if (empty(a.ageRanges)) {
    audiencePatch.ageRanges = ["25-34", "35-44"];
    audienceChanged = true;
  }
  if (empty(a.segments)) {
    audiencePatch.segments = [b.businessModel === "B2B" ? "Empresas" : "Consumidores finales"];
    audienceChanged = true;
  }
  if (empty(a.painPoints)) {
    audiencePatch.painPoints = [getFieldExample("painPoint", ind)];
    audienceChanged = true;
  }
  if (empty(a.behavior)) {
    audiencePatch.behavior = getFieldExample("behavior", ind);
    audienceChanged = true;
  }
  if (empty(a.locations)) {
    audiencePatch.locations = ["Todo el país"];
    audienceChanged = true;
  }
  if (audienceChanged) {
    patch.audience = audiencePatch;
    statuses.audience = SUGGESTED;
  }

  // Objetivos
  const g = b.goals;
  const goalsPatch = { ...g };
  let goalsChanged = false;
  if (empty(g.businessObjectives)) {
    goalsPatch.businessObjectives = getFieldExample("businessObjectives", ind);
    goalsChanged = true;
  }
  if (empty(g.marketingObjectives)) {
    goalsPatch.marketingObjectives = getFieldExample("marketingObjectives", ind);
    goalsChanged = true;
  }
  if (empty(g.successMetrics)) {
    goalsPatch.successMetrics = ["Ventas", "Alcance"];
    goalsChanged = true;
  }
  if (empty(g.timeline)) {
    goalsPatch.timeline = "Próximos 3 meses";
    goalsChanged = true;
  }
  if (goalsChanged) {
    patch.goals = goalsPatch;
    statuses.goals = SUGGESTED;
  }

  // Brand Kit (tono / colores / tipografía) si está vacío
  const bk = b.brandKit;
  const noColor = !bk?.colors?.primary && !bk?.colors?.palette?.length;
  const noTone = !bk?.voiceTone?.toneTags?.length;
  if (noColor || noTone) {
    patch.brandKit = suggestBrandKit(b, bk);
    statuses.brandKit = SUGGESTED;
  }

  // Campos que NO sugerimos (deben ser reales): nombre, país, provincia,
  // ciudad y precios. Si faltan, quedan pendientes.
  if (empty(b.name)) stillMissing.push("Nombre de la empresa");
  if (empty(b.country)) stillMissing.push("País");
  if (empty(b.state)) stillMissing.push("Provincia / Estado");
  if (empty(b.city)) stillMissing.push("Ciudad");
  if (empty(b.industry)) stillMissing.push("Industria");
  if (empty(b.productsServices)) stillMissing.push("Al menos un producto o servicio");

  return { patch, statuses, stillMissing };
}
