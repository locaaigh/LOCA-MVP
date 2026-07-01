import type { Business, ContentItem } from "@/lib/types";
import { nowIso, uid } from "@/lib/utils";
import { SYSTEM_EVA, feedbackPrompt } from "../prompts";
import { asArray, asString } from "../shared/normalize";
import type { Agent, AgentResult } from "../shared/result";
import { withTextAgent } from "./_shared";

export interface ContentFeedbackAgentInput {
  business: Business;
  item: ContentItem;
  feedbackText: string;
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

export const contentFeedbackAgent: Agent<ContentFeedbackAgentInput, ContentItem> = {
  id: "content-feedback",

  async run({ business, item, feedbackText }): Promise<AgentResult<ContentItem>> {
    const entry = { id: uid("fb"), feedback: feedbackText, at: nowIso() };
    const mockResult = () => ({
      ...applyMockFeedback(item, feedbackText),
      feedbackHistory: [...item.feedbackHistory, entry],
      updatedAt: nowIso(),
    });

    const result = await withTextAgent(
      mockResult,
      async (chatJson) => {
        const j = (await chatJson(
          SYSTEM_EVA,
          feedbackPrompt(business, item, feedbackText)
        )) as Record<string, unknown>;
        return {
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
          status: "generado" as const,
          updatedAt: nowIso(),
        };
      },
      "IA no disponible, ajuste en modo demo"
    );
    return result;
  },
};
