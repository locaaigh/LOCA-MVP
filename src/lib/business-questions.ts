// ─────────────────────────────────────────────────────────────
// Modelo declarativo de "preguntas del negocio".
// Separa información CRÍTICA (bloquea la estrategia) de la AMPLIADA
// (mejora resultados pero no bloquea). Lo usan:
//  - el flujo de pendientes 1-de-N (onboarding y configuración)
//  - el cálculo de completitud del perfil
//  - el gate de generación de estrategia (missingCritical)
// NUNCA inventa datos: solo describe qué falta y cómo editarlo.
// ─────────────────────────────────────────────────────────────
import type { Business, BusinessStage, Channel } from "./types";
import {
  INDUSTRIES,
  BUSINESS_TYPES,
  BUSINESS_STAGES,
  AGE_RANGES,
  VALUE_SUGGESTIONS,
  ADVANTAGE_SUGGESTIONS,
  MARKETING_ACTIVITIES,
  foundingYearOptions,
  seasonalityOptionsFor,
  specialDatesOptionsFor,
} from "./constants";
import { emptyBrandKit } from "./store";

export type QSection =
  | "basicos"
  | "productos"
  | "audiencia"
  | "propuesta"
  | "canales"
  | "objetivos"
  | "brandkit"
  | "agenda"
  | "fechas"
  | "restricciones"
  | "necesidades";

export type QInput =
  | "text"
  | "textarea"
  | "select"
  | "chips"
  | "channels"
  | "products"
  | "country"
  | "region"
  // "section": campo con input especial (color/tipografía/foto) que se completa
  // en su sección del formulario, no inline. El flujo de pendientes muestra un
  // botón que lleva a esa sección.
  | "section";

export interface BusinessQuestion {
  id: string;
  section: QSection;
  label: string;
  why: string;
  input: QInput;
  options?: string[] | ((b: Business) => string[]);
  allowCustom?: boolean;
  placeholder?: string;
  critical: boolean;
  /**
   * Si el dato es OBLIGATORIO para terminar el onboarding (entra al flujo
   * "Completá lo que falta"). Default: true. FLAG DATA-DRIVEN: el futuro
   * backoffice de admins lo editará por campo (ideal moverlo a DB) sin tocar la UI.
   */
  required?: boolean;
  canSuggest?: boolean;
  get: (b: Business) => any;
  apply: (b: Business, v: any) => Partial<Business>;
  isMissing: (b: Business) => boolean;
}

const TONE_OPTIONS = [
  "Cercano",
  "Profesional",
  "Divertido",
  "Premium",
  "Inspirador",
  "Directo",
  "Amigable",
  "Confiable",
  "Moderno",
  "Elegante",
];

const GOAL_LABELS = ["Visibilidad", "Ventas", "Confianza"];

const empty = (v: any) => v == null || v === "" || (Array.isArray(v) && v.length === 0);
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Etiquetas legibles de cada sección (para la UI).
export const SECTION_LABELS: Record<QSection, string> = {
  basicos: "Datos básicos",
  productos: "Productos y servicios",
  audiencia: "Audiencia",
  propuesta: "Propuesta de valor",
  canales: "Canales y objetivos",
  objetivos: "Objetivos",
  brandkit: "Brand Kit",
  agenda: "Agenda comercial",
  fechas: "Fechas importantes",
  restricciones: "Restricciones y a evitar",
  necesidades: "Necesidades a comunicar",
};

export const QUESTIONS: BusinessQuestion[] = [
  // ── Críticos (bloquean estrategia) ──
  {
    id: "name",
    section: "basicos",
    label: "Nombre del negocio",
    why: "Eva lo usa para firmar y personalizar cada contenido.",
    input: "text",
    placeholder: "Ej: Café Bruma",
    critical: true,
    get: (b) => b.name,
    apply: (_b, v) => ({ name: v }),
    isMissing: (b) => empty(b.name),
  },
  {
    id: "industry",
    section: "basicos",
    label: "Industria",
    why: "Define el tono, los formatos y los ejemplos que Eva sugiere.",
    input: "select",
    options: INDUSTRIES,
    critical: true,
    get: (b) => b.industry,
    apply: (_b, v) => ({ industry: v }),
    isMissing: (b) => empty(b.industry),
  },
  {
    id: "subcategory",
    section: "basicos",
    label: "Rubro / subcategoría",
    why: "Ayuda a que los contenidos hablen de lo que realmente vendés.",
    input: "text",
    placeholder: "Ej: Cafetería de especialidad",
    critical: true,
    canSuggest: true,
    get: (b) => b.subcategory,
    apply: (_b, v) => ({ subcategory: v }),
    isMissing: (b) => empty(b.subcategory),
  },
  {
    id: "businessType",
    section: "basicos",
    label: "Tipo de negocio",
    why: "Eva adapta el contenido a local físico, online o servicios.",
    input: "select",
    options: BUSINESS_TYPES,
    critical: true,
    get: (b) => b.businessType,
    apply: (_b, v) => ({ businessType: v }),
    isMissing: (b) => empty(b.businessType),
  },
  {
    id: "country",
    section: "basicos",
    label: "País o mercado principal",
    why: "Para ajustar idioma, fechas y referencias locales.",
    input: "country",
    placeholder: "Ej: Argentina",
    critical: true,
    get: (b) => b.country,
    apply: (_b, v) => ({ country: v }),
    isMissing: (b) => empty(b.country),
  },
  {
    id: "shortDescription",
    section: "basicos",
    label: "Descripción corta",
    why: "Es la base que Eva usa para entender de qué se trata tu marca.",
    input: "textarea",
    placeholder: "En una o dos frases, ¿qué hace tu negocio?",
    critical: true,
    canSuggest: true,
    get: (b) => b.shortDescription,
    apply: (_b, v) => ({ shortDescription: v }),
    isMissing: (b) => empty(b.shortDescription),
  },
  {
    id: "products",
    section: "productos",
    label: "Productos o servicios",
    why: "Eva necesita al menos uno para generar contenido que venda.",
    input: "products",
    critical: true,
    get: (b) => b.productsServices,
    apply: (_b) => ({}),
    isMissing: (b) => !b.productsServices?.some((p) => p.name?.trim()),
  },
  {
    id: "audience",
    section: "audiencia",
    label: "A quién le hablás (edades)",
    why: "Define el lenguaje y los temas de cada publicación.",
    input: "chips",
    options: AGE_RANGES,
    critical: true,
    canSuggest: true,
    get: (b) => b.audience?.ageRanges || [],
    apply: (b, v) => ({ audience: { ...b.audience, ageRanges: v } }),
    isMissing: (b) => empty(b.audience?.ageRanges) && empty(b.audience?.segments),
  },
  {
    id: "competitiveAdvantages",
    section: "propuesta",
    label: "Por qué te eligen (diferenciador)",
    why: "Es el ángulo de venta que Eva resalta en los contenidos.",
    input: "chips",
    options: ADVANTAGE_SUGGESTIONS,
    allowCustom: true,
    critical: true,
    canSuggest: true,
    get: (b) => b.competitiveAdvantages,
    apply: (_b, v) => ({ competitiveAdvantages: v }),
    isMissing: (b) => empty(b.competitiveAdvantages),
  },
  {
    id: "primaryContentGoal",
    section: "objetivos",
    label: "Objetivo principal",
    why: "Orienta toda la estrategia (vender, dar a conocer o generar confianza).",
    input: "select",
    options: GOAL_LABELS,
    critical: true,
    get: (b) => cap(b.goals?.primaryContentGoal || ""),
    apply: (b, v) => ({
      goals: { ...b.goals, primaryContentGoal: String(v).toLowerCase() as Business["goals"]["primaryContentGoal"] },
    }),
    isMissing: (b) => empty(b.goals?.primaryContentGoal),
  },
  {
    id: "marketingChannels",
    section: "canales",
    label: "Canales / plataformas",
    why: "Eva crea el contenido para las redes que vas a usar.",
    input: "channels",
    critical: true,
    canSuggest: true,
    get: (b) => b.marketingChannels,
    apply: (_b, v) => ({ marketingChannels: v }),
    isMissing: (b) => empty(b.marketingChannels),
  },
  {
    id: "toneTags",
    section: "brandkit",
    label: "Tono de marca",
    why: "Define cómo suena tu marca en cada texto.",
    input: "chips",
    options: TONE_OPTIONS,
    allowCustom: true,
    critical: true,
    canSuggest: true,
    get: (b) => b.brandKit?.voiceTone?.toneTags || [],
    apply: (b, v) => {
      const bk = b.brandKit || emptyBrandKit();
      return { brandKit: { ...bk, voiceTone: { ...bk.voiceTone, toneTags: v } } };
    },
    isMissing: (b) => empty(b.brandKit?.voiceTone?.toneTags),
  },

  // ── Ampliados (recomendados, no bloquean) ──
  {
    id: "fullDescription",
    section: "basicos",
    label: "Descripción completa",
    why: "Cuanto más sepa Eva, más específicos son los contenidos.",
    input: "textarea",
    placeholder: "Contanos en detalle qué hacés, cómo y para quién.",
    critical: false,
    canSuggest: true,
    get: (b) => b.fullDescription,
    apply: (_b, v) => ({ fullDescription: v }),
    isMissing: (b) => empty(b.fullDescription),
  },
  {
    id: "values",
    section: "propuesta",
    label: "Valores de marca",
    why: "Dan personalidad y coherencia a la comunicación.",
    input: "chips",
    options: VALUE_SUGGESTIONS,
    allowCustom: true,
    critical: false,
    canSuggest: true,
    get: (b) => b.values,
    apply: (_b, v) => ({ values: (v as string[]).slice(0, 5) }),
    isMissing: (b) => empty(b.values),
  },
  {
    id: "marketingActivities",
    section: "canales",
    label: "Qué venís haciendo de marketing",
    why: "Eva parte de lo que ya hacés para no repetir.",
    input: "chips",
    options: MARKETING_ACTIVITIES,
    critical: false,
    required: false, // su propia ayuda dice "si no hacés nada, está perfecto"
    get: (b) => b.marketingActivities,
    apply: (_b, v) => ({ marketingActivities: v }),
    isMissing: (b) => empty(b.marketingActivities),
  },
  {
    id: "seasonalityTags",
    section: "agenda",
    label: "Temporadas fuertes",
    why: "Eva planifica contenido alrededor de tus picos de venta.",
    input: "chips",
    options: (b) => seasonalityOptionsFor(b.industry),
    allowCustom: true,
    critical: false,
    // Opcional por defecto: no todo negocio tiene temporadas, y el flujo con IA
    // (solo chips) no tiene un "no tengo" → obligarlo trabaría. El admin lo prende.
    required: false,
    get: (b) => b.seasonalityTags,
    apply: (_b, v) => ({ hasSeasonality: (v as string[]).length > 0, seasonalityTags: v }),
    isMissing: (b) => empty(b.seasonalityTags),
  },
  {
    id: "specialDates",
    section: "fechas",
    label: "Fechas especiales",
    why: "Para sumar campañas en fechas clave de tu negocio.",
    input: "chips",
    options: (b) => specialDatesOptionsFor(b.industry),
    allowCustom: true,
    critical: false,
    required: false, // opcional por defecto (ver seasonalityTags)
    get: (b) => b.specialDates,
    apply: (_b, v) => ({ hasSpecialDates: (v as string[]).length > 0, specialDates: v }),
    isMissing: (b) => empty(b.specialDates),
  },
  {
    id: "avoidList",
    section: "restricciones",
    label: "Cosas a evitar",
    why: "Eva no va a usar estas palabras, temas o claims.",
    input: "chips",
    options: [],
    allowCustom: true,
    critical: false,
    required: false, // muchos negocios no tienen nada que evitar
    get: (b) => b.brandKit?.avoidList || [],
    apply: (b, v) => {
      const bk = b.brandKit || emptyBrandKit();
      return { brandKit: { ...bk, avoidList: v } };
    },
    isMissing: (b) => empty(b.brandKit?.avoidList),
  },
  {
    id: "communicationNeeds",
    section: "necesidades",
    label: "Necesidades a comunicar este mes",
    why: "Lanzamientos, promos o mensajes clave que querés priorizar.",
    input: "textarea",
    placeholder: "Ej: Lanzamos un nuevo blend; queremos promocionar el 2x1 de los martes.",
    critical: false,
    required: false, // opcional: es un extra del mes, no un dato base del negocio
    get: (b) => b.communicationNeeds || "",
    apply: (_b, v) => ({ communicationNeeds: v }),
    isMissing: (b) => empty(b.communicationNeeds),
  },

  // ── Campos que antes vivían solo en field-requirements (wizard) ──
  // Se suman acá para que el admin los liste, el flujo con IA los pida y el
  // gate/completitud los contemplen. Mismos ids que field-requirements (así
  // la derivación de `critical` por id sigue coincidiendo). Todos critical:false.
  {
    id: "businessStage",
    section: "basicos",
    label: "Tipo de organización",
    why: "Ajusta el tono y los ejemplos (emprendimiento, pyme, startup, marca personal).",
    input: "select",
    options: BUSINESS_STAGES.map((s) => s.label),
    critical: false,
    get: (b) => BUSINESS_STAGES.find((s) => s.value === b.businessStage)?.label || "",
    apply: (_b, v) => ({ businessStage: BUSINESS_STAGES.find((s) => s.label === v)?.value }),
    isMissing: (b) => empty(b.businessStage),
  },
  {
    id: "yearFounded",
    section: "basicos",
    label: "Año de fundación",
    why: "Contexto de madurez del negocio.",
    input: "select",
    options: () => foundingYearOptions(new Date().getFullYear()).map((o) => o.value),
    critical: false,
    get: (b) => b.yearFounded || "",
    apply: (_b, v) => ({ yearFounded: v }),
    isMissing: (b) => empty(b.yearFounded),
  },
  {
    id: "employees",
    section: "basicos",
    label: "Cantidad de empleados",
    why: "Ayuda a dimensionar el negocio.",
    input: "text",
    placeholder: "Ej: 5",
    critical: false,
    get: (b) => b.employees || "",
    apply: (_b, v) => ({ employees: v }),
    isMissing: (b) => empty(b.employees),
  },
  {
    id: "state",
    section: "basicos",
    label: "Provincia / Estado",
    why: "Para referencias y campañas locales.",
    input: "region",
    critical: false,
    get: (b) => b.state,
    apply: (_b, v) => ({ state: v }),
    isMissing: (b) => empty(b.state),
  },
  {
    id: "city",
    section: "basicos",
    label: "Ciudad",
    why: "Para referencias y campañas locales.",
    input: "text",
    placeholder: "Ej: Palermo, CABA",
    critical: false,
    get: (b) => b.city,
    apply: (_b, v) => ({ city: v }),
    isMissing: (b) => empty(b.city),
  },
  {
    id: "locations",
    section: "audiencia",
    label: "Ubicaciones objetivo",
    why: "Dónde está tu audiencia (ciudades, zonas, país).",
    input: "chips",
    allowCustom: true,
    critical: false,
    canSuggest: true,
    get: (b) => b.audience?.locations || [],
    apply: (b, v) => ({ audience: { ...b.audience, locations: v } }),
    isMissing: (b) => empty(b.audience?.locations),
  },
  {
    id: "painPoints",
    section: "audiencia",
    label: "Qué problema le resolvés",
    why: "El dolor que resuelve tu negocio orienta todo el contenido.",
    input: "chips",
    allowCustom: true,
    critical: false,
    canSuggest: true,
    get: (b) => b.audience?.painPoints || [],
    apply: (b, v) => ({ audience: { ...b.audience, painPoints: v } }),
    isMissing: (b) => empty(b.audience?.painPoints),
  },
  {
    id: "behavior",
    section: "audiencia",
    label: "Comportamiento del cliente",
    why: "Cómo compra y decide tu cliente.",
    input: "textarea",
    placeholder: "Ej: compara precios, compra por impulso en fechas especiales…",
    critical: false,
    canSuggest: true,
    get: (b) => b.audience?.behavior || "",
    apply: (b, v) => ({ audience: { ...b.audience, behavior: v } }),
    isMissing: (b) => empty(b.audience?.behavior),
  },
  {
    id: "segments",
    section: "audiencia",
    label: "Segmentos de audiencia",
    why: "Grupos distintos a los que le hablás.",
    input: "chips",
    allowCustom: true,
    critical: false,
    canSuggest: true,
    get: (b) => b.audience?.segments || [],
    apply: (b, v) => ({ audience: { ...b.audience, segments: v } }),
    isMissing: (b) => empty(b.audience?.segments),
  },
  {
    id: "businessObjectives",
    section: "objetivos",
    label: "Objetivos de negocio",
    why: "Qué querés lograr con el negocio (más allá del contenido).",
    input: "textarea",
    placeholder: "Ej: abrir un segundo local, duplicar ventas online…",
    critical: false,
    get: (b) => b.goals?.businessObjectives || "",
    apply: (b, v) => ({ goals: { ...b.goals, businessObjectives: v } }),
    isMissing: (b) => empty(b.goals?.businessObjectives),
  },
  {
    id: "successMetrics",
    section: "objetivos",
    label: "Métricas de éxito",
    why: "Cómo vas a medir si el marketing funciona.",
    input: "chips",
    allowCustom: true,
    critical: false,
    get: (b) => b.goals?.successMetrics || [],
    apply: (b, v) => ({ goals: { ...b.goals, successMetrics: v } }),
    isMissing: (b) => empty(b.goals?.successMetrics),
  },
  {
    id: "marketingObjectives",
    section: "objetivos",
    label: "Objetivos de marketing",
    why: "Qué querés lograr puntualmente con el marketing.",
    input: "textarea",
    placeholder: "Ej: ganar seguidores, más consultas por DM…",
    critical: false,
    get: (b) => b.goals?.marketingObjectives || "",
    apply: (b, v) => ({ goals: { ...b.goals, marketingObjectives: v } }),
    isMissing: (b) => empty(b.goals?.marketingObjectives),
  },
  {
    id: "timeline",
    section: "objetivos",
    label: "Plazo",
    why: "En cuánto tiempo querés ver resultados.",
    input: "text",
    placeholder: "Ej: 3 meses",
    critical: false,
    get: (b) => b.goals?.timeline || "",
    apply: (b, v) => ({ goals: { ...b.goals, timeline: v } }),
    isMissing: (b) => empty(b.goals?.timeline),
  },
  {
    id: "publishChannels",
    section: "canales",
    label: "Dónde publicar",
    why: "Las cuentas concretas donde Eva va a publicar.",
    input: "channels",
    critical: false,
    get: (b) => b.publishChannels || [],
    apply: (_b, v) => ({ publishChannels: v as Channel[] }),
    isMissing: (b) => empty(b.publishChannels),
  },
  {
    id: "bk_color",
    section: "brandkit",
    label: "Un color de marca",
    why: "Eva usa tus colores en las piezas.",
    input: "section",
    critical: false,
    get: (b) => b.brandKit?.colors?.primary || "",
    apply: (_b) => ({}),
    isMissing: (b) =>
      !(!!b.brandKit?.colors?.primary || (b.brandKit?.colors?.palette?.length ?? 0) > 0),
  },
  {
    id: "bk_font",
    section: "brandkit",
    label: "Una tipografía",
    why: "Para que los textos sobre las imágenes usen tu tipografía.",
    input: "section",
    critical: false,
    get: (b) => b.brandKit?.typography?.heading?.family || b.brandKit?.typography?.body?.family || "",
    apply: (_b) => ({}),
    isMissing: (b) =>
      !(!!b.brandKit?.typography?.heading?.family || !!b.brandKit?.typography?.body?.family),
  },
  {
    id: "personPhotos",
    section: "brandkit",
    label: "Al menos una foto tuya",
    why: "Para marca personal: sin foto propia, no se generan rostros.",
    input: "section",
    critical: false,
    // Solo aplica (y bloquea) a marca personal / profesional independiente.
    get: (b) => b.personPhotos || [],
    apply: (_b) => ({}),
    isMissing: (b) =>
      (b.businessStage === "profesional_independiente" || b.businessType === "Marca personal") &&
      empty(b.personPhotos),
  },
];

// ── Overrides del backoffice ─────────────────────────────────
// Los admins pueden cambiar required/critical por campo desde /admin (tabla
// onboarding_field_config). Los DEFAULTS son los de código, capturados acá
// ANTES de aplicar ningún override; applyFieldConfigOverrides es idempotente
// (restaura defaults y aplica), así un fetch repetido nunca acumula estado.

/** Piso intocable: sin estos campos la estrategia sería de otro negocio. */
export const FLOOR_FIELD_IDS = new Set(["name", "industry"]);

const DEFAULT_FLAGS = new Map(
  QUESTIONS.map((q) => [q.id, { required: q.required !== false, critical: q.critical }])
);
// Textos y posición default de cada campo (para restaurar y para el backoffice).
const DEFAULT_TEXTS = new Map(
  QUESTIONS.map((q) => [q.id, { label: q.label, placeholder: q.placeholder, why: q.why }])
);
// Clave de orden default: índice * 10, así un sort_order custom puede
// intercalarse entre dos defaults sin renumerar todo.
const DEFAULT_ORDER = new Map(QUESTIONS.map((q, i) => [q.id, i * 10]));

/** Flags default (de código) de un campo, para mostrarlos en el backoffice. */
export function defaultFlagsOf(id: string): { required: boolean; critical: boolean } | undefined {
  return DEFAULT_FLAGS.get(id);
}

/** Textos default (de código) de un campo, para mostrarlos en el backoffice. */
export function defaultTextsOf(
  id: string
): { label: string; placeholder?: string; why: string } | undefined {
  return DEFAULT_TEXTS.get(id);
}

/** Clave de orden efectiva de un campo (override o posición default). */
export function sortKeyOf(id: string, override?: number | null): number {
  return override ?? DEFAULT_ORDER.get(id) ?? 0;
}

export interface FieldFlagsOverride {
  fieldId: string;
  required?: boolean | null;
  critical?: boolean | null;
  sortOrder?: number | null;
  label?: string | null;
  placeholder?: string | null;
  why?: string | null;
}

/**
 * Aplica los overrides del backoffice sobre el registro en memoria: flags,
 * textos y orden. Idempotente (restaura defaults y aplica). Garantiza el
 * invariante crítico ⇒ obligatorio y nunca toca los flags del piso.
 */
export function applyFieldConfigOverrides(overrides: FieldFlagsOverride[]): void {
  for (const q of QUESTIONS) {
    const d = DEFAULT_FLAGS.get(q.id)!;
    const t = DEFAULT_TEXTS.get(q.id)!;
    q.required = d.required;
    q.critical = d.critical;
    q.label = t.label;
    q.placeholder = t.placeholder;
    q.why = t.why;
  }
  const orderOverride = new Map<string, number>();
  for (const o of overrides) {
    const q = QUESTIONS.find((x) => x.id === o.fieldId);
    if (!q) continue;
    if (!FLOOR_FIELD_IDS.has(q.id)) {
      if (typeof o.critical === "boolean") q.critical = o.critical;
      if (typeof o.required === "boolean") q.required = o.required;
      if (q.critical) q.required = true;
    }
    if (typeof o.label === "string" && o.label.trim()) q.label = o.label.trim();
    if (typeof o.placeholder === "string" && o.placeholder.trim()) q.placeholder = o.placeholder.trim();
    if (typeof o.why === "string" && o.why.trim()) q.why = o.why.trim();
    if (typeof o.sortOrder === "number") orderOverride.set(q.id, o.sortOrder);
  }
  // Reordenar en el lugar: los consumidores (flujo de pendientes, 1-de-N,
  // completitud) iteran QUESTIONS, así que el orden del array ES el orden.
  QUESTIONS.sort(
    (a, b) => sortKeyOf(a.id, orderOverride.get(a.id)) - sortKeyOf(b.id, orderOverride.get(b.id))
  );
}

/** Preguntas críticas que faltan (las que bloquean la estrategia). */
export function missingCriticalQuestions(b: Business): BusinessQuestion[] {
  return QUESTIONS.filter((q) => q.critical && q.isMissing(b));
}

/** Labels de los críticos faltantes (para banners / gate). */
export function missingCriticalLabels(b: Business): string[] {
  return missingCriticalQuestions(b).map((q) => q.label);
}

/** Pendientes a completar: críticos primero, luego ampliados. */
export function pendingQuestions(b: Business, includeExtended = true): BusinessQuestion[] {
  return QUESTIONS.filter((q) => (includeExtended || q.critical) && q.isMissing(b)).sort(
    (a, c) => Number(c.critical) - Number(a.critical)
  );
}

/** Un dato es obligatorio salvo que se marque required:false (futuro backoffice). */
export function isQuestionRequired(q: BusinessQuestion): boolean {
  return q.required !== false;
}

/** Pendientes OBLIGATORIOS (faltantes + requeridos). Base del flujo "Completá lo que falta". */
export function missingRequiredQuestions(b: Business): BusinessQuestion[] {
  return pendingQuestions(b).filter(isQuestionRequired);
}

/** Labels de los OBLIGATORIOS faltantes (para el gate/banner del resumen final). */
export function missingRequiredLabels(b: Business): string[] {
  return missingRequiredQuestions(b).map((q) => q.label);
}

/** % de completitud del perfil (sobre el total de preguntas). */
export function completionPercent(b: Business): number {
  const answered = QUESTIONS.filter((q) => !q.isMissing(b)).length;
  return Math.round((answered / QUESTIONS.length) * 100);
}

export interface SectionStatus {
  key: QSection;
  label: string;
  total: number;
  missing: number;
  missingCritical: number;
}

/** Estado por sección (para la pantalla "Información del negocio"). */
export function sectionsStatus(b: Business): SectionStatus[] {
  const order: QSection[] = [
    "basicos",
    "productos",
    "audiencia",
    "propuesta",
    "canales",
    "objetivos",
    "brandkit",
    "agenda",
    "fechas",
    "restricciones",
    "necesidades",
  ];
  return order
    .map((key) => {
      const qs = QUESTIONS.filter((q) => q.section === key);
      const missing = qs.filter((q) => q.isMissing(b));
      return {
        key,
        label: SECTION_LABELS[key],
        total: qs.length,
        missing: missing.length,
        missingCritical: missing.filter((q) => q.critical).length,
      };
    })
    .filter((s) => s.total > 0);
}

export function questionsForSection(section: QSection): BusinessQuestion[] {
  return QUESTIONS.filter((q) => q.section === section);
}
