// ─────────────────────────────────────────────────────────────
// Merge de un análisis de web / import .md sobre un Business.
// FUENTE ÚNICA: la usa el onboarding (cliente) para aplicar lo que Eva
// encontró, y el log de calidad (servidor) para computar qué quedaría
// faltando en el onboarding REAL después de ese análisis. Si divergieran,
// el log mentiría sobre lo que se le pide al usuario.
// Pura: no toca stores ni estado global.
// ─────────────────────────────────────────────────────────────
import type { Business, ProductService, ProductServiceType, WebsiteAnalysis } from "@/lib/types";
import { uid } from "@/lib/utils";

export function emptyProductService(type: ProductServiceType): ProductService {
  return {
    id: uid("ps"),
    type,
    name: "",
    category: "",
    subcategory: "",
    shortDescription: "",
    longDescription: "",
    features: [],
    variants: [],
    pricingType: "fijo",
    currency: "ARS",
    priceMin: undefined,
    priceMax: undefined,
    imageCaption: "",
    keywords: [],
    negativeKeywords: [],
    isTopSeller: false,
    saved: false,
    importSource: "manual",
  };
}

/** Aplica lo encontrado/sugerido por el análisis sobre `prev` (sin mutarlo). */
export function applyAnalysisToBusiness(prev: Business, a: WebsiteAnalysis): Business {
  const ff = a.foundFields;
  const next: Business = { ...prev };
  if (ff.name) next.name = ff.name;
  if (ff.websiteUrl) next.websiteUrl = ff.websiteUrl;
  if (ff.industry) next.industry = ff.industry;
  if (ff.subcategory) next.subcategory = ff.subcategory;
  if (ff.businessType) next.businessType = ff.businessType;
  if (ff.businessModel && ["B2B", "B2C", "Ambos"].includes(ff.businessModel))
    next.businessModel = ff.businessModel as Business["businessModel"];
  if (ff.country) next.country = ff.country;
  if (ff.state) next.state = ff.state;
  if (ff.city) next.city = ff.city;
  if (ff.shortDescription) next.shortDescription = ff.shortDescription;
  if (ff.fullDescription) next.fullDescription = ff.fullDescription;
  if (ff.values?.length) next.values = ff.values;
  if (ff.competitiveAdvantages?.length) next.competitiveAdvantages = ff.competitiveAdvantages;
  if (ff.marketingChannels?.length) next.marketingChannels = ff.marketingChannels;
  if (ff.marketingActivities?.length) next.marketingActivities = ff.marketingActivities;
  if (ff.productsServices?.length) {
    next.productsServices = ff.productsServices.map((p) => ({
      ...emptyProductService(p.type),
      name: p.name,
      category: p.category || "",
      shortDescription: p.shortDescription || "",
      // No inventamos precio: solo si vino explícito.
      priceMin: typeof p.price === "number" ? p.price : undefined,
      currency: p.currency || "ARS",
      isTopSeller: !!p.isTopSeller,
      saved: true,
      importSource: (p.source as ProductService["importSource"]) || "website",
      confidence: p.confidence,
      shouldReview: p.shouldReview,
    }));
  }
  if (ff.audience) {
    next.audience = {
      ...prev.audience,
      ageRanges: ff.audience.ageRanges?.length ? ff.audience.ageRanges : prev.audience.ageRanges,
      gender: (ff.audience.gender as Business["audience"]["gender"]) || prev.audience.gender,
      socioeconomicLevel:
        (ff.audience.socioeconomicLevel as Business["audience"]["socioeconomicLevel"]) ||
        prev.audience.socioeconomicLevel,
      segments: ff.audience.segments?.length ? ff.audience.segments : prev.audience.segments,
      painPoints: ff.audience.painPoints?.length ? ff.audience.painPoints : prev.audience.painPoints,
      behavior: ff.audience.behavior || prev.audience.behavior,
    };
  }
  if (ff.goals) {
    next.goals = {
      ...prev.goals,
      primaryContentGoal:
        (ff.goals.primaryContentGoal as Business["goals"]["primaryContentGoal"]) ||
        prev.goals.primaryContentGoal,
      marketingObjectives: ff.goals.marketingObjectives || prev.goals.marketingObjectives,
      businessObjectives: ff.goals.businessObjectives || prev.goals.businessObjectives,
    };
  }
  if (ff.seasonalityTags?.length) {
    next.seasonalityTags = ff.seasonalityTags;
    next.hasSeasonality = true;
  }
  if (ff.specialDates?.length) {
    next.specialDates = ff.specialDates;
    next.hasSpecialDates = true;
  }
  if (ff.brandKit) next.brandKit = ff.brandKit;
  if (ff.businessIntelligence) next.businessIntelligence = ff.businessIntelligence;
  next.fieldStatuses = { ...prev.fieldStatuses, ...a.fieldStatuses };
  next.websiteExtractionStatus = "done";
  next.websiteExtractionConsent = true;
  return next;
}
