"use client";

import type {
  AiMeta,
  Business,
  CalendarItem,
  ContentItem,
  ExtractedBusinessInfo,
  GoogleAdsStrategy,
  ImageFormat,
  MetaAdsStrategy,
  ProductDescriptionSuggestion,
  ProductService,
  Strategy,
} from "./types";

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || `Error ${res.status}`);
  }
  return res.json();
}

type R<T> = { data: T; meta: AiMeta };

export const api = {
  status: () =>
    fetch("/api/status").then(
      (r) => r.json() as Promise<{ hasOpenAI: boolean; textModel: string; imageModel: string }>
    ),
  strategy: (business: Business, feedback?: string) =>
    post<R<Strategy>>("/api/strategy", { business, feedback }),
  calendar: (business: Business, strategy: Strategy, count: number, feedback?: string) =>
    post<R<CalendarItem[]>>("/api/calendar", { business, strategy, count, feedback }),
  content: (business: Business, strategy: Strategy, calendarItem: CalendarItem) =>
    post<R<ContentItem>>("/api/content", { business, strategy, calendarItem }),
  feedback: (business: Business, item: ContentItem, feedback: string) =>
    post<R<ContentItem>>("/api/content/feedback", { business, item, feedback }),
  image: (prompt: string, format: ImageFormat, label?: string, concept?: string) =>
    post<{
      imageUrl: string;
      prompt: string;
      provider: "openai" | "mock";
      status: "generada" | "error";
      error?: string;
    }>("/api/image", { prompt, format, label, concept }),
  metaAds: (business: Business) =>
    post<R<MetaAdsStrategy>>("/api/ads", { business, platform: "meta" }),
  googleAds: (business: Business) =>
    post<R<GoogleAdsStrategy>>("/api/ads", { business, platform: "google" }),
  extractWebsite: (url: string) =>
    post<R<ExtractedBusinessInfo>>("/api/extract", { url }),
  productDescription: (business: Business, draft: ProductService) =>
    post<R<ProductDescriptionSuggestion>>("/api/product-description", { business, draft }),
};
