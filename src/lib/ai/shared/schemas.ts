// ─────────────────────────────────────────────────────────────
// Schemas Zod de la SALIDA de cada agente (F3.1). Si la salida del modelo no
// valida, `withTextAgent` reintenta una vez pasándole el error; recién si
// falla de nuevo cae al mock (marcado). Tolerantes en lo accesorio, estrictos
// en lo que la UI necesita sí o sí.
// ─────────────────────────────────────────────────────────────
import { z } from "zod";
import { PIECE_PURPOSES } from "../types";

const str = z.string().trim();
const strArr = z.array(z.string()).default([]);
const nonEmpty = str.min(1);

export const strategyOutputSchema = z
  .object({
    businessSummary: nonEmpty,
    brandPositioning: nonEmpty,
    audienceSummary: nonEmpty,
    mainAngle: nonEmpty,
    contentPillars: z.array(z.object({ name: nonEmpty, description: str.default("") })).min(2).max(6),
    toneOfVoice: nonEmpty,
    recommendedChannels: z.array(z.string()).min(1),
    monthlyGoal: nonEmpty,
    recommendedCta: nonEmpty,
    offerIdeas: strArr,
    dos: z.array(z.string()).min(2),
    donts: z.array(z.string()).min(2),
    keyMessages: strArr,
    contentMix: z.array(z.object({ type: nonEmpty, percentage: z.coerce.number() })).default([]),
    nextActions: strArr,
  })
  .passthrough();

export const purposeSchema = z.enum(PIECE_PURPOSES as [string, ...string[]]);

export const calendarItemOutputSchema = z
  .object({
    dayOffset: z.coerce.number().int().min(1).max(31),
    suggestedTime: str.default("18:00"),
    channel: nonEmpty,
    format: nonEmpty,
    contentPillar: nonEmpty,
    objective: str.default("Alcance"),
    topic: nonEmpty,
    purpose: purposeSchema.catch("marca"),
    angle: str.default(""),
    hookIdea: str.default(""),
    visualConcept: str.default(""),
    needsTextOverlay: z.coerce.boolean().default(false),
  })
  .passthrough();

export const calendarOutputSchema = z.object({ items: z.array(calendarItemOutputSchema).min(1) }).passthrough();

export const overlayOutputSchema = z
  .object({
    headline: nonEmpty.max(90),
    subheadline: str.max(160).optional(),
    price: str.max(30).optional(),
    cta: str.max(40).optional(),
  })
  .passthrough();

export const contentOutputSchema = z
  .object({
    title: nonEmpty,
    caption: nonEmpty,
    hook: nonEmpty,
    body: str.default(""),
    cta: nonEmpty,
    visualConcept: str.min(10),
    suggestedLayout: str.default(""),
    designTextOverlay: str.default(""),
    assetNotes: str.default(""),
    overlay: overlayOutputSchema.nullable().optional(),
    photoBrief: z
      .object({ idea: str, shotList: strArr, props: strArr, composition: str.default("") })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

export const feedbackOutputSchema = z
  .object({
    title: nonEmpty,
    caption: nonEmpty,
    hook: nonEmpty,
    body: str.default(""),
    cta: nonEmpty,
    visualConcept: str.default(""),
    suggestedLayout: str.default(""),
    designTextOverlay: str.default(""),
    assetNotes: str.default(""),
    overlay: overlayOutputSchema.nullable().optional(),
    imageChangeRequested: z.coerce.boolean().default(false),
  })
  .passthrough();

export const carouselOutputSchema = z
  .object({
    title: nonEmpty,
    caption: nonEmpty,
    hook: nonEmpty,
    cta: nonEmpty,
    slides: z
      .array(
        z
          .object({
            role: z.enum(["portada", "punto", "cierre"]).catch("punto"),
            visualConcept: str.min(10),
            overlay: overlayOutputSchema.nullable().optional(),
          })
          .passthrough()
      )
      .min(2)
      .max(8),
  })
  .passthrough();

export const productDescriptionOutputSchema = z
  .object({
    shortDescription: nonEmpty,
    longDescription: nonEmpty,
    features: strArr,
    keywords: strArr,
  })
  .passthrough();

export const metaAdsOutputSchema = z
  .object({
    campaignObjective: nonEmpty,
    funnelStage: str.default(""),
    audiences: strArr,
    interests: strArr,
    adAngles: strArr,
    copyVariants: z.array(z.string()).min(1),
    headlines: z.array(z.string()).min(1),
    ctas: strArr,
    creativeSuggestions: strArr,
    budgetRecommendation: str.default(""),
    destination: str.default(""),
  })
  .passthrough();

export const googleAdsOutputSchema = z
  .object({
    campaignType: nonEmpty,
    searchIntent: str.default(""),
    keywords: z.array(z.string()).min(1),
    negativeKeywords: strArr,
    copyVariants: z.array(z.string()).min(1),
    landingSuggestion: str.default(""),
    budgetRecommendation: str.default(""),
  })
  .passthrough();

/** Análisis de web (texto y visión): casi todo opcional, pero el objeto tiene que existir y tener industria o descripción. */
export const websiteAnalysisOutputSchema = z
  .object({
    industry: str.default(""),
    subcategory: str.default(""),
    shortDescription: str.default(""),
    whatEvaUnderstood: str.default(""),
  })
  .passthrough()
  .refine((o) => o.industry || o.shortDescription || o.whatEvaUnderstood, {
    message: "Faltan industry, shortDescription y whatEvaUnderstood: al menos uno es obligatorio.",
  });

/** Formatea el error de Zod para pasárselo al modelo en el reintento de reparación. */
export function formatZodError(err: z.ZodError): string {
  return err.issues
    .slice(0, 8)
    .map((i) => `- ${i.path.join(".") || "(raíz)"}: ${i.message}`)
    .join("\n");
}
