import { z } from "zod";
import type { Business, CalendarItem, ContentItem, Strategy } from "@/lib/types";

export const productServiceSchema = z
  .object({
    id: z.string(),
    type: z.enum(["producto", "servicio"]),
    name: z.string(),
    features: z.array(z.string()).default([]),
    variants: z.array(z.string()).default([]),
    keywords: z.array(z.string()).default([]),
    negativeKeywords: z.array(z.string()).default([]),
    isTopSeller: z.boolean().default(false),
    currency: z.string().default("ARS"),
    pricingType: z.enum(["fijo", "rango", "por_variante", "variable"]).default("fijo"),
  })
  .passthrough();

export const businessSchema = z
  .object({
    id: z.string(),
    userId: z.string(),
    name: z.string(),
    industry: z.string(),
    subcategory: z.string(),
    businessType: z.string(),
    businessModel: z.enum(["B2B", "B2C", "Ambos"]),
    country: z.string(),
    state: z.string(),
    city: z.string(),
    shortDescription: z.string(),
    fullDescription: z.string(),
    values: z.array(z.string()).default([]),
    competitiveAdvantages: z.array(z.string()).default([]),
    marketingChannels: z.array(z.string()).default([]),
    productsServices: z.array(productServiceSchema).default([]),
    onboardingComplete: z.boolean().default(false),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

export const strategySchema = z
  .object({
    id: z.string(),
    businessId: z.string(),
    businessSummary: z.string(),
    brandPositioning: z.string(),
    audienceSummary: z.string(),
    mainAngle: z.string(),
    contentPillars: z.array(z.object({ name: z.string(), description: z.string() })),
    toneOfVoice: z.string(),
    recommendedChannels: z.array(z.string()),
    monthlyGoal: z.string(),
    recommendedCta: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

export const calendarItemSchema = z
  .object({
    id: z.string(),
    businessId: z.string(),
    strategyId: z.string(),
    date: z.string(),
    channel: z.string(),
    format: z.string(),
    topic: z.string(),
    status: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

export const contentItemSchema = z
  .object({
    id: z.string(),
    businessId: z.string(),
    title: z.string(),
    caption: z.string(),
    status: z.string(),
    publishStatus: z.string(),
    feedbackHistory: z.array(z.object({ id: z.string(), feedback: z.string(), at: z.string() })),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

export const appSnapshotSchema = z.object({
  userId: z.string(),
  businesses: z.array(businessSchema),
  strategies: z.record(strategySchema),
  calendars: z.record(z.array(calendarItemSchema)),
  contents: z.array(contentItemSchema),
  syncedAt: z.string(),
});

export type AppSnapshotInput = {
  userId: string;
  businesses: Business[];
  strategies: Record<string, Strategy>;
  calendars: Record<string, CalendarItem[]>;
  contents: ContentItem[];
  syncedAt: string;
};
