import type { Business, ProductService } from "./types";

/** Convierte un ítem de chip a string (tolera datos viejos/corruptos en localStorage). */
export function toChipLabel(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v;
  if (v && typeof v === "object" && "name" in v) {
    const name = (v as { name?: unknown }).name;
    if (typeof name === "string" && name.trim()) return name;
  }
  return null;
}

export function normalizeChipValues(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of value) {
    const label = toChipLabel(v);
    if (label && !seen.has(label)) {
      seen.add(label);
      out.push(label);
    }
  }
  return out;
}

function sanitizeProduct(p: ProductService): ProductService {
  return {
    ...p,
    features: normalizeChipValues(p.features),
    variants: normalizeChipValues(p.variants),
    keywords: normalizeChipValues(p.keywords),
    negativeKeywords: normalizeChipValues(p.negativeKeywords),
  };
}

/** Normaliza negocios persistidos para evitar crashes por datos mal tipados. */
export function sanitizeBusiness(b: Business): Business {
  const audience = b.audience
    ? {
        ...b.audience,
        ageRanges: normalizeChipValues(b.audience.ageRanges),
        locations: normalizeChipValues(b.audience.locations),
        painPoints: normalizeChipValues(b.audience.painPoints),
        segments: normalizeChipValues(b.audience.segments),
      }
    : b.audience;

  const goals = b.goals
    ? { ...b.goals, successMetrics: normalizeChipValues(b.goals.successMetrics) }
    : b.goals;

  const brandKit = b.brandKit
    ? {
        ...b.brandKit,
        visualStyle: b.brandKit.visualStyle
          ? { ...b.brandKit.visualStyle, mood: normalizeChipValues(b.brandKit.visualStyle.mood) }
          : b.brandKit.visualStyle,
        voiceTone: b.brandKit.voiceTone
          ? { ...b.brandKit.voiceTone, toneTags: normalizeChipValues(b.brandKit.voiceTone.toneTags) }
          : b.brandKit.voiceTone,
        brandKeywords: normalizeChipValues(b.brandKit.brandKeywords),
        avoidList: normalizeChipValues(b.brandKit.avoidList),
      }
    : b.brandKit;

  return {
    ...b,
    values: normalizeChipValues(b.values),
    competitiveAdvantages: normalizeChipValues(b.competitiveAdvantages),
    marketingChannels: normalizeChipValues(b.marketingChannels),
    marketingActivities: normalizeChipValues(b.marketingActivities),
    seasonalityTags: normalizeChipValues(b.seasonalityTags),
    specialDates: normalizeChipValues(b.specialDates),
    productsServices: (b.productsServices || []).map(sanitizeProduct),
    audience,
    goals,
    brandKit,
  };
}
