import type { Business, CalendarItem, ContentItem, Strategy } from "@/lib/types";
import { mockContent } from "../mock";
import { SYSTEM_EVA, contentPrompt } from "../prompts";
import { asArray, asString, normalizePhoto, normalizeVideo } from "../shared/normalize";
import type { Agent, AgentResult } from "../shared/result";
import { withTextAgent } from "./_shared";

export interface ContentAgentInput {
  business: Business;
  strategy: Strategy;
  calendarItem: CalendarItem;
}

const baseImage = {
  imageStatus: "pendiente" as const,
  imageUrl: undefined,
  imageProvider: undefined,
  imageError: undefined,
};

export const contentAgent: Agent<ContentAgentInput, ContentItem> = {
  id: "content",

  async run({ business, strategy, calendarItem }): Promise<AgentResult<ContentItem>> {
    const fb = mockContent(business, strategy, calendarItem);
    return withTextAgent(
      () => ({ ...fb, ...baseImage }),
      async (chatJson) => {
        const j = (await chatJson(
          SYSTEM_EVA,
          contentPrompt(business, strategy, calendarItem)
        )) as Record<string, unknown>;
        return {
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
      },
      "IA no disponible, pieza en modo demo"
    );
  },
};
