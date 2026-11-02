// ─────────────────────────────────────────────────────────────
// Carrusel (B3, capa de agentes): narrativa de 2 a 8 slides con rol, misma
// variante de estilo y mismas referencias en todas. Las imágenes se generan
// en paralelo (límite 2) con estado por slide: una slide que falla no tumba
// el carrusel. El flag `carrusel` sigue apagado hasta que exista UI y publicación.
// ─────────────────────────────────────────────────────────────
import type { Business, CalendarItem, CarouselSlide, ContentItem, Strategy } from "@/lib/types";
import { nowIso, uid } from "@/lib/utils";
import { mockContent } from "../mock";
import { SYSTEM_EVA, carouselPrompt, stableContext } from "../prompts";
import { asString } from "../shared/normalize";
import { carouselOutputSchema } from "../shared/schemas";
import type { Agent, AgentResult } from "../shared/result";
import type { AiMeta } from "@/lib/types";
import type { OverlaySpec } from "../types";
import { formatRules } from "../image/formats";
import { resolvePieceStyle } from "../image/style-resolver";
import { collectReferences } from "../image/references";
import { generatePieceImage, type ImagePipelineResult } from "../image/pipeline";
import { toDataUrl } from "../image/raster";
import { withTextAgent } from "./_shared";

export interface CarouselAgentInput {
  business: Business;
  strategy: Strategy;
  calendarItem: CalendarItem;
  slideCount?: number;
}

export const CAROUSEL_SLIDES = { min: 2, max: 8, default: 5 } as const;

/** Paso 1: copy + slides (texto). */
export const carouselAgent: Agent<CarouselAgentInput, ContentItem> = {
  id: "carousel",

  async run({ business, strategy, calendarItem, slideCount }): Promise<AgentResult<ContentItem>> {
    const count = Math.max(CAROUSEL_SLIDES.min, Math.min(CAROUSEL_SLIDES.max, slideCount ?? CAROUSEL_SLIDES.default));
    const fb = mockContent(business, strategy, { ...calendarItem, format: "carrusel" });
    const purpose = calendarItem.purpose ?? "educativo";
    const style = resolvePieceStyle(business, purpose);
    const rules = formatRules(calendarItem.channel, "carrusel");
    const base: ContentItem = {
      ...fb,
      format: "carrusel",
      purpose,
      imageFormat: rules.aspect,
      imageStatus: "pendiente",
      imageUrl: undefined,
      imageProvider: undefined,
      imageError: undefined,
      videoScript: undefined,
    };
    const mockSlides = (): CarouselSlide[] =>
      Array.from({ length: count }, (_, i) => ({
        id: uid("sl"),
        order: i,
        role: i === 0 ? "portada" : i === count - 1 ? "cierre" : "punto",
        visualConcept: fb.visualConcept,
        imagePrompt: fb.visualConcept,
        imageStatus: "pendiente",
        overlay: { treatment: style.treatment.id, headline: i === 0 ? fb.hook : i === count - 1 ? fb.cta : `${fb.title} ${i}`, zone: style.treatment.zone },
      }));

    return withTextAgent<ContentItem>(
      "carousel",
      () => ({ ...base, carouselSlides: mockSlides(), isMock: true }),
      async (chatJson) => {
        const j = await chatJson(SYSTEM_EVA, carouselPrompt(calendarItem, count), {
          cachePrefix: stableContext(business, strategy),
          schema: carouselOutputSchema,
        });
        const slides: CarouselSlide[] = j.slides.slice(0, CAROUSEL_SLIDES.max).map((s, i) => {
          const overlay: OverlaySpec | undefined = s.overlay?.headline
            ? {
                treatment: style.treatment.id,
                headline: s.overlay.headline.trim().slice(0, 90),
                subheadline: s.overlay.subheadline?.trim() || undefined,
                cta: s.overlay.cta?.trim() || undefined,
                zone: style.treatment.zone,
              }
            : undefined;
          return {
            id: uid("sl"),
            order: i,
            role: i === 0 ? "portada" : i === j.slides.length - 1 ? "cierre" : s.role,
            visualConcept: asString(s.visualConcept),
            imagePrompt: asString(s.visualConcept),
            imageStatus: "pendiente",
            overlay,
          };
        });
        return {
          ...base,
          title: asString(j.title, fb.title),
          caption: asString(j.caption, fb.caption),
          hook: asString(j.hook, fb.hook),
          body: "",
          cta: asString(j.cta, fb.cta),
          hashtags: [],
          visualConcept: slides[0]?.visualConcept || fb.visualConcept,
          imagePrompt: slides[0]?.visualConcept || fb.visualConcept,
          designTextOverlay: slides[0]?.overlay?.headline ?? "",
          carouselSlides: slides,
          isMock: false,
        };
      },
      "IA no disponible, carrusel en modo demo"
    );
  },
};

export interface CarouselImagesResult {
  slides: CarouselSlide[];
  results: ImagePipelineResult[];
  meta: AiMeta;
}

/** Paso 2: imágenes de todas las slides, en paralelo con límite, mismas referencias, una sola variante. */
export async function generateCarouselImages(
  business: Business,
  content: ContentItem,
  opts?: { concurrency?: number; onSlide?: (slide: CarouselSlide, result: ImagePipelineResult) => Promise<void> | void }
): Promise<CarouselImagesResult> {
  const slides = [...(content.carouselSlides ?? [])].sort((a, b) => a.order - b.order);
  const concurrency = Math.max(1, Math.min(3, opts?.concurrency ?? 2));
  const references = await collectReferences(business, content);
  const results: ImagePipelineResult[] = new Array(slides.length);
  const startedAt = Date.now();
  let cost = 0;
  let next = 0;

  async function worker() {
    while (next < slides.length) {
      const i = next++;
      const slide = slides[i];
      // Misma variante en todo el carrusel: pieceIndex fijo (0) → no rota.
      const r = await generatePieceImage({ business, content, slide, pieceIndex: 0, references });
      results[i] = r;
      cost += r.generation.costUsd;
      slides[i] = {
        ...slide,
        imageStatus: r.status === "generada" ? "generada" : "error",
        imageUrl: r.status === "generada" && r.bytes ? toDataUrl(r.bytes, r.mimeType || "image/jpeg") : slide.imageUrl,
        imageProvider: r.generation.provider,
        imageError: r.error,
        imagePrompt: r.generation.prompt,
        generation: r.generation,
        overlay: slide.overlay,
      };
      await opts?.onSlide?.(slides[i], r);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const ok = results.filter((r) => r?.status === "generada").length;
  return {
    slides,
    results,
    meta: {
      provider: results.find((r) => r?.status === "generada")?.generation.provider ?? "mock",
      model: results.find((r) => r?.status === "generada")?.generation.model,
      durationMs: Date.now() - startedAt,
      usage: { inputTokens: 0, outputTokens: 0, costUsd: cost },
      warning: ok < slides.length ? `${slides.length - ok} slide(s) sin imagen` : undefined,
    },
  };
}

export function carouselUpdatedAt(): string {
  return nowIso();
}
