// ─────────────────────────────────────────────────────────────
// Modelo declarativo de "preguntas del negocio".
// Separa información CRÍTICA (bloquea la estrategia) de la AMPLIADA
// (mejora resultados pero no bloquea). Lo usan:
//  - el flujo de pendientes 1-de-N (onboarding y configuración)
//  - el cálculo de completitud del perfil
//  - el gate de generación de estrategia (missingCritical)
// NUNCA inventa datos: solo describe qué falta y cómo editarlo.
// ─────────────────────────────────────────────────────────────
import type { Business } from "./types";
import {
  INDUSTRIES,
  BUSINESS_TYPES,
  AGE_RANGES,
  VALUE_SUGGESTIONS,
  ADVANTAGE_SUGGESTIONS,
  MARKETING_ACTIVITIES,
  SEASONALITY_OPTIONS,
  SPECIAL_DATES_OPTIONS,
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

export type QInput = "text" | "textarea" | "select" | "chips" | "channels" | "products" | "country";

export interface BusinessQuestion {
  id: string;
  section: QSection;
  label: string;
  why: string;
  input: QInput;
  options?: string[];
  allowCustom?: boolean;
  placeholder?: string;
  critical: boolean;
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
    options: SEASONALITY_OPTIONS,
    allowCustom: true,
    critical: false,
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
    options: SPECIAL_DATES_OPTIONS,
    allowCustom: true,
    critical: false,
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
    get: (b) => b.communicationNeeds || "",
    apply: (_b, v) => ({ communicationNeeds: v }),
    isMissing: (b) => empty(b.communicationNeeds),
  },
];

export const CRITICAL_QUESTIONS = QUESTIONS.filter((q) => q.critical);

/** Preguntas críticas que faltan (las que bloquean la estrategia). */
export function missingCriticalQuestions(b: Business): BusinessQuestion[] {
  return CRITICAL_QUESTIONS.filter((q) => q.isMissing(b));
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
