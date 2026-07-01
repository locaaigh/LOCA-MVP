import type { Business, MetaAdsStrategy } from "@/lib/types";
import { mockMetaAds } from "../mock";
import { SYSTEM_EVA, metaAdsPrompt } from "../prompts";
import { asArray, asString } from "../shared/normalize";
import type { Agent, AgentResult } from "../shared/result";
import { withTextAgent } from "./_shared";

export const metaAdsAgent: Agent<{ business: Business }, MetaAdsStrategy> = {
  id: "ads-meta",

  async run({ business }): Promise<AgentResult<MetaAdsStrategy>> {
    const fb = mockMetaAds(business);
    return withTextAgent(
      () => fb,
      async (chatJson) => {
        const j = (await chatJson(SYSTEM_EVA, metaAdsPrompt(business))) as Record<string, unknown>;
        return {
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
      }
    );
  },
};
