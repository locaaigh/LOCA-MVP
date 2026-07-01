import type { Business, GoogleAdsStrategy } from "@/lib/types";
import { mockGoogleAds } from "../mock";
import { SYSTEM_EVA, googleAdsPrompt } from "../prompts";
import { asArray, asString } from "../shared/normalize";
import type { Agent, AgentResult } from "../shared/result";
import { withTextAgent } from "./_shared";

export const googleAdsAgent: Agent<{ business: Business }, GoogleAdsStrategy> = {
  id: "ads-google",

  async run({ business }): Promise<AgentResult<GoogleAdsStrategy>> {
    const fb = mockGoogleAds(business);
    return withTextAgent(
      () => fb,
      async (chatJson) => {
        const j = (await chatJson(SYSTEM_EVA, googleAdsPrompt(business))) as Record<string, unknown>;
        return {
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
      }
    );
  },
};
