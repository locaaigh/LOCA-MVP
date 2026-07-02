"use client";

import type {
  AiMeta,
  CalendarItem,
  ContentItem,
  GoogleAdsStrategy,
  ImageFormat,
  MetaAdsStrategy,
  ProductDescriptionSuggestion,
  ProductService,
  Strategy,
  WebsiteAnalysis,
} from "./types";
import {
  locaUserHeaders,
  syncRepositoryToServer,
  type SyncOptions,
} from "./repository/client-sync";

async function aiPost<T>(
  url: string,
  body: unknown,
  syncOpts?: SyncOptions & { skipSync?: boolean }
): Promise<R<T>> {
  // skipSync: en batch, /api/content ya persistió la pieza en el servidor;
  // repetir el sync completo por cada imagen es innecesario y pesado.
  if (!syncOpts?.skipSync) await syncRepositoryToServer(syncOpts);
  const business = syncOpts?.includeBusiness;
  return post<R<T>>(url, body, business);
}

async function post<T>(
  url: string,
  body: unknown,
  business?: import("./types").Business
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...locaUserHeaders(business) },
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
      (r) =>
        r.json() as Promise<{
          hasTextAI: boolean;
          hasImageAI: boolean;
          textProvider: string;
          textModel: string;
          imageProvider: string;
          imageModel: string;
          // legacy
          hasOpenAI?: boolean;
        }>
    ),

  strategy: (businessId: string, feedback?: string) =>
    aiPost<Strategy>("/api/strategy", { businessId, feedback }),

  calendar: (businessId: string, count: number, feedback?: string) =>
    aiPost<CalendarItem[]>("/api/calendar", { businessId, count, feedback }),

  content: (businessId: string, calendarItemId: string) =>
    aiPost<ContentItem>("/api/content", { businessId, calendarItemId }),

  feedback: (businessId: string, contentId: string, feedback: string) =>
    aiPost<ContentItem>("/api/content/feedback", { businessId, contentId, feedback }),

  image: (
    businessId: string,
    contentId: string,
    syncOpts?: SyncOptions & { skipSync?: boolean }
  ) =>
    aiPost<{
      imageUrl: string;
      prompt: string;
      provider: "openai" | "gemini" | "mock";
      status: "generada" | "error";
      error?: string;
    }>("/api/image", { businessId, contentId }, syncOpts),

  metaAds: (businessId: string) =>
    aiPost<MetaAdsStrategy>("/api/ads", { businessId, platform: "meta" }),

  googleAds: (businessId: string) =>
    aiPost<GoogleAdsStrategy>("/api/ads", { businessId, platform: "google" }),

  extractWebsite: (url: string) => post<R<WebsiteAnalysis>>("/api/extract", { url }),

  deleteBusiness: (businessId: string) =>
    fetch(`/api/business?id=${encodeURIComponent(businessId)}`, {
      method: "DELETE",
      headers: locaUserHeaders(),
    }),

  deleteContent: (contentId: string) =>
    fetch(`/api/content/delete?id=${encodeURIComponent(contentId)}`, {
      method: "DELETE",
      headers: locaUserHeaders(),
    }),

  productDescription: (businessId: string, draft: ProductService, business?: import("./types").Business) =>
    aiPost<ProductDescriptionSuggestion>(
      "/api/product-description",
      { businessId, draft },
      business ? { includeBusiness: business } : undefined
    ),
};
