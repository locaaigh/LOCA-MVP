// ─────────────────────────────────────────────────────────────
// Fábricas puras de Business/BrandKit — SIN "use client".
// Antes vivían en store.ts (que es client-only): cuando una ruta de servidor
// las importaba a través de business-questions, Next las convertía en proxies
// de cliente y LLAMARLAS tiraba error en runtime (el log de análisis quedaba
// sin la vista del onboarding, en silencio). Acá son importables desde
// cualquier lado; store.ts las re-exporta para no romper imports existentes.
// ─────────────────────────────────────────────────────────────
import type { BrandKit, Business, BusinessIntelligence } from "./types";
import { nowIso, uid } from "./utils";

export function emptyBrandKit(): BrandKit {
  return {
    colors: { palette: [] },
    typography: {},
    logos: [],
    visualStyle: { mood: [] },
    voiceTone: { toneTags: [] },
    brandKeywords: [],
    avoidList: [],
  };
}

export function emptyBusinessIntelligence(): BusinessIntelligence {
  return {
    socialLinks: [],
    contactInfo: {},
    conversionPaths: {},
    valuePropositions: [],
  };
}

export function emptyBusiness(userId: string): Business {
  return {
    id: uid("biz"),
    userId,
    name: "",
    industry: "",
    subcategory: "",
    businessType: "",
    businessModel: undefined,
    yearFounded: "",
    employees: "",
    country: "",
    state: "",
    city: "",
    shortDescription: "",
    fullDescription: "",
    values: [],
    competitiveAdvantages: [],
    marketingChannels: [],
    marketingStrategy: "",
    marketingActivities: [],
    hasSeasonality: undefined,
    seasonality: "",
    seasonalityTags: [],
    hasSpecialDates: undefined,
    specialDates: [],
    hasWebsite: undefined,
    websiteUrl: "",
    websiteExtractionConsent: false,
    websiteExtractionStatus: "idle",
    brandColors: ["#ec4899", "#84cc16", "#ffffff"],
    brandKit: emptyBrandKit(),
    businessIntelligence: emptyBusinessIntelligence(),
    fieldStatuses: {},
    businessInfoImportSource: "manual",
    productsServices: [],
    audience: {
      ageRanges: [],
      gender: "todos",
      locationLogic: "ciudad",
      locations: [],
      socioeconomicLevel: "medio",
      painPoints: [],
      behavior: "",
      segments: [],
    },
    goals: {
      primaryContentGoal: "visibilidad",
      businessObjectives: "",
      successMetrics: [],
      marketingObjectives: "",
      timeline: "",
    },
    onboardingComplete: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}
