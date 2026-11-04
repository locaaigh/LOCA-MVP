import type { Business, ContentItem } from "@/lib/types";
import { nowIso, uid } from "@/lib/utils";
import { SYSTEM_EVA, feedbackPrompt } from "../prompts";
import { asString } from "../shared/normalize";
import { feedbackOutputSchema } from "../shared/schemas";
import { sanitizeStoryFields } from "../shared/validators";
import type { Agent, AgentResult } from "../shared/result";
import type { ContentVersion, OverlaySpec } from "../types";
import { withTextAgent } from "./_shared";

export interface ContentFeedbackAgentInput {
  business: Business;
  item: ContentItem;
  feedbackText: string;
}

export interface ContentFeedbackResult extends ContentItem {
  /** true si el ajuste pide cambiar la imagen: la app debe regenerarla (nueva versión). */
  imageChangeRequested?: boolean;
}

const MAX_VERSIONS = 3;

/** Guarda la versión actual de la pieza (V1, V2…) antes de reemplazarla. */
export function snapshotVersion(item: ContentItem, reason: ContentVersion["reason"]): ContentVersion[] {
  const v: ContentVersion = {
    id: uid("ver"),
    createdAt: nowIso(),
    reason,
    snapshot: {
      title: item.title,
      hook: item.hook,
      caption: item.caption,
      body: item.body,
      cta: item.cta,
      visualConcept: item.visualConcept,
      imagePrompt: item.imagePrompt,
      imageUrl: item.imageUrl,
      overlay: item.overlay,
      generation: item.generation,
      designTextOverlay: item.designTextOverlay,
    },
  };
  return [...(item.versions ?? []), v].slice(-MAX_VERSIONS);
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

export const contentFeedbackAgent: Agent<ContentFeedbackAgentInput, ContentFeedbackResult> = {
  id: "content-feedback",

  async run({ business, item, feedbackText }): Promise<AgentResult<ContentFeedbackResult>> {
    const entry = { id: uid("fb"), feedback: feedbackText, at: nowIso() };
    const versions = snapshotVersion(item, "feedback");
    const mockResult = (): ContentFeedbackResult => ({
      ...applyMockFeedback(item, feedbackText),
      feedbackHistory: [...item.feedbackHistory, entry],
      versions,
      updatedAt: nowIso(),
      isMock: true,
      imageChangeRequested: false,
    });

    return withTextAgent(
      "content-feedback",
      mockResult,
      async (chatJson) => {
        const j = await chatJson(SYSTEM_EVA, feedbackPrompt(business, item, feedbackText), { schema: feedbackOutputSchema });
        const visualConcept = asString(j.visualConcept, item.visualConcept);
        const imageChanged = j.imageChangeRequested || (visualConcept !== item.visualConcept && !!visualConcept);
        const overlay: OverlaySpec | undefined = j.overlay?.headline && item.overlay
          ? { ...item.overlay, headline: j.overlay.headline, subheadline: j.overlay.subheadline || undefined, price: j.overlay.price || undefined, cta: j.overlay.cta || undefined }
          : item.overlay;
        let out: ContentFeedbackResult = {
          ...item,
          title: asString(j.title, item.title),
          caption: asString(j.caption, item.caption),
          hook: asString(j.hook, item.hook),
          body: asString(j.body, ""),
          cta: asString(j.cta, item.cta),
          hashtags: [],
          visualConcept,
          imagePrompt: imageChanged ? visualConcept : item.imagePrompt,
          suggestedLayout: asString(j.suggestedLayout, item.suggestedLayout),
          designTextOverlay: overlay?.headline ?? asString(j.designTextOverlay, item.designTextOverlay),
          assetNotes: asString(j.assetNotes, item.assetNotes),
          overlay,
          feedbackHistory: [...item.feedbackHistory, entry],
          versions,
          status: "generado" as const,
          updatedAt: nowIso(),
          isMock: false,
          imageChangeRequested: imageChanged,
        };
        if (item.format === "story") {
          const s = sanitizeStoryFields(out as unknown as Record<string, unknown>, ["caption", "hook", "body", "cta", "designTextOverlay"]);
          out = s.value as unknown as ContentFeedbackResult;
        }
        // El overlay cambió → la imagen compuesta cambia aunque el fondo sea el mismo.
        if (!imageChanged && overlay && item.overlay && JSON.stringify(overlay) !== JSON.stringify(item.overlay)) {
          out.imageChangeRequested = true;
        }
        return out;
      },
      "IA no disponible, ajuste en modo demo"
    );
  },
};
