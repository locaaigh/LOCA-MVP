import type { Business, CalendarItem, ContentItem, Strategy } from "@/lib/types";
import { mockContent } from "../mock";
import { SYSTEM_EVA, stableContext, contentBriefPrompt } from "../prompts";
import { asString, normalizePhoto } from "../shared/normalize";
import { contentOutputSchema } from "../shared/schemas";
import { sanitizeStoryFields } from "../shared/validators";
import type { Agent, AgentResult } from "../shared/result";
import type { OverlaySpec, PiecePurpose } from "../types";
import { imageFormatFor } from "../image/formats";
import { resolvePieceStyle } from "../image/style-resolver";
import { inferPurpose } from "../image/pipeline";
import { withTextAgent } from "./_shared";

export interface ContentAgentInput {
  business: Business;
  strategy: Strategy;
  calendarItem: CalendarItem;
  /** Hooks de piezas ya generadas este mes (para no repetir). */
  previousHooks?: string[];
}

const baseImage = {
  imageStatus: "pendiente" as const,
  imageUrl: undefined,
  imageProvider: undefined,
  imageError: undefined,
};

function overlayFrom(
  raw: { headline?: string; subheadline?: string; price?: string; cta?: string } | null | undefined,
  business: Business,
  purpose: PiecePurpose,
  isStory: boolean
): OverlaySpec | undefined {
  if (!raw?.headline) return undefined;
  const style = resolvePieceStyle(business, purpose);
  return {
    treatment: style.treatment.id,
    headline: raw.headline.trim().slice(0, 90),
    subheadline: raw.subheadline?.trim() || undefined,
    price: raw.price?.trim() || undefined,
    cta: raw.cta?.trim() || undefined,
    zone: isStory ? "center" : style.treatment.zone,
  };
}

/**
 * Pieza de contenido: copy + concepto visual (en inglés) + overlay si lleva texto.
 * El prompt final de imagen NO lo escribe el modelo: lo arma image/pipeline.ts.
 * `imagePrompt` se completa con el concepto para que la UI actual siga mostrando algo.
 */
export const contentAgent: Agent<ContentAgentInput, ContentItem> = {
  id: "content",

  async run({ business, strategy, calendarItem, previousHooks }): Promise<AgentResult<ContentItem>> {
    const fb = mockContent(business, strategy, calendarItem);
    const purpose: PiecePurpose =
      calendarItem.purpose ?? inferPurpose({ ...calendarItem, title: calendarItem.topic }, business.productsServices.some((p) => (p.photos?.length ?? 0) > 0));
    const isStory = calendarItem.format === "story";
    const imageFormat = imageFormatFor(calendarItem.channel, calendarItem.format);

    const result = await withTextAgent(
      "content",
      () => ({ ...fb, ...baseImage, purpose, imageFormat, isMock: true }),
      async (chatJson) => {
        const j = await chatJson(SYSTEM_EVA, contentBriefPrompt(calendarItem, { previousHooks }), {
          cachePrefix: stableContext(business, strategy),
          schema: contentOutputSchema,
        });
        const visualConcept = asString(j.visualConcept, calendarItem.visualConcept || fb.visualConcept);
        const overlay = overlayFrom(j.overlay, business, purpose, isStory);
        let item: ContentItem = {
          ...fb,
          ...baseImage,
          purpose,
          imageFormat,
          title: asString(j.title, fb.title),
          caption: asString(j.caption, fb.caption),
          hook: asString(j.hook, fb.hook),
          body: asString(j.body, ""),
          cta: asString(j.cta, fb.cta),
          hashtags: [],
          visualConcept,
          imagePrompt: visualConcept,
          suggestedLayout: asString(j.suggestedLayout, fb.suggestedLayout),
          designTextOverlay: overlay?.headline ?? asString(j.designTextOverlay, ""),
          assetNotes: asString(j.assetNotes, fb.assetNotes),
          overlay,
          videoScript: undefined,
          photoBrief: normalizePhoto(j.photoBrief) || fb.photoBrief,
          isMock: false,
        };
        if (isStory) {
          // Validación en código de la regla anti "story interactiva" (B5).
          const s = sanitizeStoryFields(item as unknown as Record<string, unknown>, ["caption", "hook", "body", "cta", "designTextOverlay"]);
          item = s.value as unknown as ContentItem;
          if (item.overlay) {
            const o = sanitizeStoryFields(item.overlay as unknown as Record<string, unknown>, ["headline", "subheadline", "cta"]);
            item.overlay = o.value as unknown as OverlaySpec;
            s.hits.push(...o.hits);
          }
          if (s.hits.length) {
            (item as ContentItem & { sanitizedNotes?: string[] }).sanitizedNotes = [`story_interactive_blocked: ${Array.from(new Set(s.hits)).join(", ")}`];
          }
        }
        return item;
      },
      "IA no disponible, pieza en modo demo"
    );
    return result;
  },
};
