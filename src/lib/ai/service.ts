// ─────────────────────────────────────────────────────────────
// Servicio CENTRAL de IA de LOCA.
// Cada función usa OpenAI si hay API key; si no, o si algo falla,
// cae a generadores mock inteligentes (sin romper la app).
// Todo se ejecuta server-side (route handlers en /api).
// ─────────────────────────────────────────────────────────────
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
  Channel,
  ContentFormat,
} from "../types";
import { nowIso, uid } from "../utils";
import { brandedPlaceholder, openAiSize } from "../placeholder";
import {
  mockCalendar,
  mockContent,
  mockGoogleAds,
  mockMetaAds,
  mockStrategy,
} from "./mock";
import { chatJson, getClient, hasOpenAI, IMAGE_MODEL } from "./openai";
import {
  SYSTEM_EVA,
  calendarPrompt,
  contentPrompt,
  extractWebsitePrompt,
  feedbackPrompt,
  googleAdsPrompt,
  metaAdsPrompt,
  productDescriptionPrompt,
  strategyPrompt,
} from "./prompts";

type Result<T> = { data: T; meta: AiMeta };

const VALID_CHANNELS: Channel[] = ["Instagram", "Facebook", "TikTok", "LinkedIn"];
const VALID_FORMATS: ContentFormat[] = [
  "post_estatico",
  "carrusel",
  "reel",
  "story",
  "ad",
  "email",
];

function asArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x));
  if (typeof v === "string" && v.trim()) return [v];
  return [];
}
function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim() ? v : fallback;
}
function asChannel(v: unknown, fb: Channel): Channel {
  return VALID_CHANNELS.includes(v as Channel) ? (v as Channel) : fb;
}
function asFormat(v: unknown, fb: ContentFormat): ContentFormat {
  return VALID_FORMATS.includes(v as ContentFormat) ? (v as ContentFormat) : fb;
}

// ── Estrategia ───────────────────────────────────────────────
export async function generateBusinessStrategy(
  b: Business,
  feedback?: string
): Promise<Result<Strategy>> {
  const fallback = mockStrategy(b);
  if (!hasOpenAI()) {
    return { data: fallback, meta: { provider: "mock" } };
  }
  try {
    const j = (await chatJson(SYSTEM_EVA, strategyPrompt(b, feedback))) as Record<string, unknown>;
    const pillarsRaw = Array.isArray(j.contentPillars) ? j.contentPillars : [];
    const pillars = pillarsRaw
      .map((p: any) => ({
        name: asString(p?.name),
        description: asString(p?.description),
      }))
      .filter((p) => p.name);
    const mixRaw = Array.isArray(j.contentMix) ? j.contentMix : [];
    const contentMix = mixRaw
      .map((m: any) => ({
        type: asString(m?.type),
        percentage: Number(m?.percentage) || 0,
      }))
      .filter((m) => m.type);
    const channels = asArray(j.recommendedChannels)
      .map((c) => asChannel(c, "Instagram"))
      .filter((c, i, arr) => arr.indexOf(c) === i);

    const data: Strategy = {
      ...fallback,
      businessSummary: asString(j.businessSummary, fallback.businessSummary),
      brandPositioning: asString(j.brandPositioning, fallback.brandPositioning),
      audienceSummary: asString(j.audienceSummary, fallback.audienceSummary),
      mainAngle: asString(j.mainAngle, fallback.mainAngle),
      contentPillars: pillars.length ? pillars.slice(0, 5) : fallback.contentPillars,
      toneOfVoice: asString(j.toneOfVoice, fallback.toneOfVoice),
      recommendedChannels: channels.length ? channels : fallback.recommendedChannels,
      monthlyGoal: asString(j.monthlyGoal, fallback.monthlyGoal),
      recommendedCta: asString(j.recommendedCta, fallback.recommendedCta),
      offerIdeas: asArray(j.offerIdeas).length ? asArray(j.offerIdeas) : fallback.offerIdeas,
      dos: asArray(j.dos).length ? asArray(j.dos) : fallback.dos,
      donts: asArray(j.donts).length ? asArray(j.donts) : fallback.donts,
      keyMessages: asArray(j.keyMessages).length ? asArray(j.keyMessages) : fallback.keyMessages,
      contentMix: contentMix.length ? contentMix : fallback.contentMix,
      nextActions: asArray(j.nextActions).length ? asArray(j.nextActions) : fallback.nextActions,
    };
    return { data, meta: { provider: "openai" } };
  } catch (e: any) {
    return {
      data: fallback,
      meta: { provider: "mock", warning: `IA no disponible, se usó modo demo. (${e?.message || e})` },
    };
  }
}

// ── Calendario ───────────────────────────────────────────────
export async function generateContentCalendar(
  b: Business,
  strategy: Strategy,
  count: number,
  feedback?: string
): Promise<Result<CalendarItem[]>> {
  const fallback = mockCalendar(b, strategy, count);
  if (!hasOpenAI()) return { data: fallback, meta: { provider: "mock" } };
  try {
    const j = (await chatJson(SYSTEM_EVA, calendarPrompt(b, strategy, count, feedback))) as Record<
      string,
      unknown
    >;
    const items = Array.isArray(j.items) ? j.items : [];
    if (!items.length) throw new Error("sin items");
    const today = new Date();
    const data: CalendarItem[] = items.slice(0, count).map((it: any, i: number) => {
      const off = Math.max(1, Math.min(30, Number(it?.dayOffset) || i + 1));
      const d = new Date(today);
      d.setDate(today.getDate() + off);
      return {
        id: uid("cal"),
        businessId: b.id,
        strategyId: strategy.id,
        date: d.toISOString().slice(0, 10),
        suggestedTime: asString(it?.suggestedTime, "18:00"),
        channel: asChannel(it?.channel, strategy.recommendedChannels[0] || "Instagram"),
        format: asFormat(it?.format, "post_estatico"),
        contentPillar: asString(it?.contentPillar, strategy.contentPillars[0]?.name || "General"),
        objective: asString(it?.objective, "Alcance"),
        topic: asString(it?.topic, "Idea de contenido"),
        status: "generado" as const,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
    });
    return { data, meta: { provider: "openai" } };
  } catch (e: any) {
    return {
      data: fallback,
      meta: { provider: "mock", warning: `IA no disponible, calendario en modo demo. (${e?.message || e})` },
    };
  }
}

// ── Contenido ────────────────────────────────────────────────
export async function generateContentPiece(
  b: Business,
  strategy: Strategy,
  item: CalendarItem
): Promise<Result<ContentItem>> {
  const fb = mockContent(b, strategy, item);
  const baseImage = {
    imageStatus: "pendiente" as const,
    imageUrl: undefined,
    imageProvider: undefined,
    imageError: undefined,
  };
  if (!hasOpenAI()) {
    return { data: { ...fb, ...baseImage }, meta: { provider: "mock" } };
  }
  try {
    const j = (await chatJson(SYSTEM_EVA, contentPrompt(b, strategy, item))) as Record<
      string,
      unknown
    >;
    const data: ContentItem = {
      ...fb,
      ...baseImage,
      title: asString(j.title, fb.title),
      caption: asString(j.caption, fb.caption),
      hook: asString(j.hook, fb.hook),
      body: asString(j.body, fb.body),
      cta: asString(j.cta, fb.cta),
      hashtags: asArray(j.hashtags).length ? asArray(j.hashtags) : fb.hashtags,
      visualConcept: asString(j.visualConcept, fb.visualConcept),
      imagePrompt: asString(j.imagePrompt, fb.imagePrompt),
      suggestedLayout: asString(j.suggestedLayout, fb.suggestedLayout),
      designTextOverlay: asString(j.designTextOverlay, fb.designTextOverlay),
      assetNotes: asString(j.assetNotes, fb.assetNotes),
      videoScript: normalizeVideo(j.videoScript) || fb.videoScript,
      photoBrief: normalizePhoto(j.photoBrief) || fb.photoBrief,
    };
    return { data, meta: { provider: "openai" } };
  } catch (e: any) {
    return {
      data: { ...fb, ...baseImage },
      meta: { provider: "mock", warning: `IA no disponible, pieza en modo demo. (${e?.message || e})` },
    };
  }
}

function normalizeVideo(v: any) {
  if (!v || typeof v !== "object") return undefined;
  const scenes = Array.isArray(v.scenes)
    ? v.scenes.map((s: any) => ({
        scene: asString(s?.scene),
        onScreenText: asString(s?.onScreenText),
        voiceover: asString(s?.voiceover),
      }))
    : [];
  if (!scenes.length) return undefined;
  return {
    concept: asString(v.concept),
    durationSeconds: Number(v.durationSeconds) || 20,
    scenes,
    music: asString(v.music),
    cta: asString(v.cta),
  };
}
function normalizePhoto(p: any) {
  if (!p || typeof p !== "object") return undefined;
  const idea = asString(p.idea);
  if (!idea) return undefined;
  return {
    idea,
    shotList: asArray(p.shotList),
    props: asArray(p.props),
    composition: asString(p.composition),
  };
}

// ── Feedback / regeneración ──────────────────────────────────
export async function regenerateContentWithFeedback(
  b: Business,
  item: ContentItem,
  feedbackText: string
): Promise<Result<ContentItem>> {
  const entry = { id: uid("fb"), feedback: feedbackText, at: nowIso() };
  if (!hasOpenAI()) {
    // Ajuste mock simple según la instrucción
    const tuned = applyMockFeedback(item, feedbackText);
    return {
      data: { ...tuned, feedbackHistory: [...item.feedbackHistory, entry], updatedAt: nowIso() },
      meta: { provider: "mock" },
    };
  }
  try {
    const j = (await chatJson(SYSTEM_EVA, feedbackPrompt(b, item, feedbackText))) as Record<
      string,
      unknown
    >;
    const data: ContentItem = {
      ...item,
      title: asString(j.title, item.title),
      caption: asString(j.caption, item.caption),
      hook: asString(j.hook, item.hook),
      body: asString(j.body, item.body),
      cta: asString(j.cta, item.cta),
      hashtags: asArray(j.hashtags).length ? asArray(j.hashtags) : item.hashtags,
      visualConcept: asString(j.visualConcept, item.visualConcept),
      imagePrompt: asString(j.imagePrompt, item.imagePrompt),
      suggestedLayout: asString(j.suggestedLayout, item.suggestedLayout),
      designTextOverlay: asString(j.designTextOverlay, item.designTextOverlay),
      assetNotes: asString(j.assetNotes, item.assetNotes),
      feedbackHistory: [...item.feedbackHistory, entry],
      status: "generado",
      updatedAt: nowIso(),
    };
    return { data, meta: { provider: "openai" } };
  } catch (e: any) {
    const tuned = applyMockFeedback(item, feedbackText);
    return {
      data: { ...tuned, feedbackHistory: [...item.feedbackHistory, entry], updatedAt: nowIso() },
      meta: { provider: "mock", warning: `IA no disponible, ajuste en modo demo. (${e?.message || e})` },
    };
  }
}

function applyMockFeedback(item: ContentItem, feedback: string): ContentItem {
  const f = feedback.toLowerCase();
  let caption = item.caption;
  let cta = item.cta;
  let hook = item.hook;
  if (f.includes("corto")) caption = caption.split("\n")[0] + `\n\n${cta} 👉`;
  if (f.includes("urgencia")) caption = `⏳ Por tiempo limitado.\n` + caption;
  if (f.includes("vendedor")) cta = "Aprovechá ahora — " + cta;
  if (f.includes("emocional")) hook = "💛 " + hook;
  if (f.includes("premium")) hook = hook.replace(/👀|🛑/g, "✨");
  if (f.includes("divertido")) hook = hook + " 🎉";
  if (f.includes("profesional")) caption = caption.replace(/👉|🎉|💛/g, "").trim();
  if (f.includes("cta")) cta = "Escribinos y te asesoramos";
  return { ...item, caption, cta, hook };
}

// ── Imagen ───────────────────────────────────────────────────
export async function generateImageForContent(
  prompt: string,
  format: ImageFormat,
  label?: string,
  concept?: string
): Promise<{
  imageUrl: string;
  prompt: string;
  provider: "openai" | "mock";
  status: "generada" | "error";
  error?: string;
}> {
  if (!hasOpenAI()) {
    return {
      imageUrl: brandedPlaceholder({ format, label, concept: "Modo demo: imagen simulada" }),
      prompt,
      provider: "mock",
      status: "generada",
    };
  }
  try {
    const res = await getClient().images.generate({
      model: IMAGE_MODEL,
      prompt: `${prompt}\n\nImportante: sin texto incrustado, composición limpia, calidad profesional para redes sociales.`,
      size: openAiSize(format) as any,
      n: 1,
    });
    const b64 = res.data?.[0]?.b64_json;
    const url = res.data?.[0]?.url;
    if (b64) {
      return {
        imageUrl: `data:image/png;base64,${b64}`,
        prompt,
        provider: "openai",
        status: "generada",
      };
    }
    if (url) {
      return { imageUrl: url, prompt, provider: "openai", status: "generada" };
    }
    throw new Error("respuesta de imagen vacía");
  } catch (e: any) {
    return {
      imageUrl: brandedPlaceholder({ format, label, concept: "No se pudo generar (ver settings)" }),
      prompt,
      provider: "mock",
      status: "error",
      error: e?.message || String(e),
    };
  }
}

// ── Ads ──────────────────────────────────────────────────────
export async function generateMetaAdsStrategy(
  b: Business
): Promise<Result<MetaAdsStrategy>> {
  const fb = mockMetaAds(b);
  if (!hasOpenAI()) return { data: fb, meta: { provider: "mock" } };
  try {
    const j = (await chatJson(SYSTEM_EVA, metaAdsPrompt(b))) as Record<string, unknown>;
    const data: MetaAdsStrategy = {
      campaignObjective: asString(j.campaignObjective, fb.campaignObjective),
      funnelStage: asString(j.funnelStage, fb.funnelStage),
      audiences: asArray(j.audiences).length ? asArray(j.audiences) : fb.audiences,
      interests: asArray(j.interests).length ? asArray(j.interests) : fb.interests,
      adAngles: asArray(j.adAngles).length ? asArray(j.adAngles) : fb.adAngles,
      copyVariants: asArray(j.copyVariants).length ? asArray(j.copyVariants) : fb.copyVariants,
      headlines: asArray(j.headlines).length ? asArray(j.headlines) : fb.headlines,
      ctas: asArray(j.ctas).length ? asArray(j.ctas) : fb.ctas,
      creativeSuggestions: asArray(j.creativeSuggestions).length
        ? asArray(j.creativeSuggestions)
        : fb.creativeSuggestions,
      budgetRecommendation: asString(j.budgetRecommendation, fb.budgetRecommendation),
      destination: asString(j.destination, fb.destination),
    };
    return { data, meta: { provider: "openai" } };
  } catch (e: any) {
    return { data: fb, meta: { provider: "mock", warning: `IA no disponible. (${e?.message || e})` } };
  }
}

// ── Extracción de info desde la web ──────────────────────────
function domainToName(url: string): string {
  try {
    const host = new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(
      /^www\./,
      ""
    );
    const base = host.split(".")[0] || host;
    return base
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase())
      .trim();
  } catch {
    return "";
  }
}

// Trae el HTML y lo convierte a texto plano (rápido y sin dependencias).
async function fetchPageText(url: string): Promise<string> {
  const full = url.startsWith("http") ? url : `https://${url}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 7000);
  try {
    const res = await fetch(full, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LOCA-Eva/1.0)" },
    });
    const html = await res.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  } finally {
    clearTimeout(t);
  }
}

export async function extractBusinessInfoFromWebsite(
  url: string
): Promise<Result<ExtractedBusinessInfo>> {
  const name = domainToName(url);
  const fallback: ExtractedBusinessInfo = { name };

  let pageText = "";
  try {
    pageText = await fetchPageText(url);
  } catch {
    // No se pudo leer la web → devolvemos lo mínimo (nombre del dominio).
    return {
      data: fallback,
      meta: {
        provider: "mock",
        warning: "Eva no pudo leer toda la web, pero podés completar el formulario manualmente.",
      },
    };
  }

  if (!hasOpenAI() || !pageText) {
    // Sin IA: derivamos lo básico del texto/dominio.
    return {
      data: {
        ...fallback,
        shortDescription: pageText ? pageText.slice(0, 160) : "",
      },
      meta: { provider: "mock" },
    };
  }

  try {
    const j = (await chatJson(SYSTEM_EVA, extractWebsitePrompt(url, pageText))) as Record<
      string,
      unknown
    >;
    const products = Array.isArray(j.products)
      ? j.products
          .map((p: any) => ({
            type: p?.type === "servicio" ? ("servicio" as const) : ("producto" as const),
            name: asString(p?.name),
            shortDescription: asString(p?.shortDescription),
          }))
          .filter((p) => p.name)
      : [];
    const data: ExtractedBusinessInfo = {
      name: asString(j.name, name),
      industry: asString(j.industry),
      subcategory: asString(j.subcategory),
      shortDescription: asString(j.shortDescription),
      fullDescription: asString(j.fullDescription),
      products,
      socialChannels: asArray(j.socialChannels),
      tone: asString(j.tone),
      country: asString(j.country),
      city: asString(j.city),
      competitiveAdvantages: asArray(j.competitiveAdvantages),
    };
    return { data, meta: { provider: "openai" } };
  } catch (e: any) {
    return {
      data: fallback,
      meta: {
        provider: "mock",
        warning: "Eva leyó la web pero no pudo estructurar todo. Revisá y completá lo que falte.",
      },
    };
  }
}

// ── Descripción de producto/servicio con Eva ─────────────────
function mockProductDescription(
  b: Business,
  draft: ProductService
): ProductDescriptionSuggestion {
  const n = draft.name || (draft.type === "servicio" ? "este servicio" : "este producto");
  return {
    shortDescription: `${n}: ${draft.type === "servicio" ? "una solución pensada para vos" : "calidad y detalle en cada pieza"}, de ${b.name}.`,
    longDescription: `${n} de ${b.name}. ${
      b.shortDescription || "Hecho con dedicación"
    }. ${b.competitiveAdvantages[0] ? `Se destaca por ${b.competitiveAdvantages[0].toLowerCase()}.` : ""}`.trim(),
    features:
      draft.features.length > 0
        ? draft.features
        : ["Calidad cuidada", "Atención cercana", b.values[0] || "Hecho con dedicación"],
    keywords: [draft.name, draft.category, b.subcategory, b.industry]
      .filter(Boolean)
      .map((k) => String(k).toLowerCase())
      .slice(0, 6),
  };
}

export async function generateProductServiceDescription(
  b: Business,
  draft: ProductService
): Promise<Result<ProductDescriptionSuggestion>> {
  const fb = mockProductDescription(b, draft);
  if (!hasOpenAI()) return { data: fb, meta: { provider: "mock" } };
  try {
    const j = (await chatJson(SYSTEM_EVA, productDescriptionPrompt(b, draft))) as Record<
      string,
      unknown
    >;
    const data: ProductDescriptionSuggestion = {
      shortDescription: asString(j.shortDescription, fb.shortDescription),
      longDescription: asString(j.longDescription, fb.longDescription),
      features: asArray(j.features).length ? asArray(j.features) : fb.features,
      keywords: asArray(j.keywords).length ? asArray(j.keywords) : fb.keywords,
    };
    return { data, meta: { provider: "openai" } };
  } catch (e: any) {
    return { data: fb, meta: { provider: "mock", warning: `IA no disponible. (${e?.message || e})` } };
  }
}

export async function generateGoogleAdsStrategy(
  b: Business
): Promise<Result<GoogleAdsStrategy>> {
  const fb = mockGoogleAds(b);
  if (!hasOpenAI()) return { data: fb, meta: { provider: "mock" } };
  try {
    const j = (await chatJson(SYSTEM_EVA, googleAdsPrompt(b))) as Record<string, unknown>;
    const data: GoogleAdsStrategy = {
      campaignType: asString(j.campaignType, fb.campaignType),
      searchIntent: asString(j.searchIntent, fb.searchIntent),
      keywords: asArray(j.keywords).length ? asArray(j.keywords) : fb.keywords,
      negativeKeywords: asArray(j.negativeKeywords).length
        ? asArray(j.negativeKeywords)
        : fb.negativeKeywords,
      copyVariants: asArray(j.copyVariants).length ? asArray(j.copyVariants) : fb.copyVariants,
      landingSuggestion: asString(j.landingSuggestion, fb.landingSuggestion),
      budgetRecommendation: asString(j.budgetRecommendation, fb.budgetRecommendation),
    };
    return { data, meta: { provider: "openai" } };
  } catch (e: any) {
    return { data: fb, meta: { provider: "mock", warning: `IA no disponible. (${e?.message || e})` } };
  }
}
