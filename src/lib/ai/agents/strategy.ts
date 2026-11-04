import type { Business, Strategy } from "@/lib/types";
import { mockStrategy } from "../mock";
import { SYSTEM_EVA, strategyPrompt } from "../prompts";
import { asArray, asChannel, asString } from "../shared/normalize";
import { strategyOutputSchema } from "../shared/schemas";
import { stripReelsFromMix } from "../shared/validators";
import type { Agent, AgentResult } from "../shared/result";
import { withTextAgent } from "./_shared";

export interface StrategyAgentInput {
  business: Business;
  feedback?: string;
}

export const strategyAgent: Agent<StrategyAgentInput, Strategy> = {
  id: "strategy",

  async run({ business, feedback }): Promise<AgentResult<Strategy>> {
    const fallback = mockStrategy(business);
    return withTextAgent(
      "strategy",
      () => fallback,
      async (chatJson) => {
        const j = await chatJson(SYSTEM_EVA, strategyPrompt(business, feedback), { schema: strategyOutputSchema });
        const pillars = j.contentPillars.map((p) => ({ name: asString(p.name), description: asString(p.description) })).filter((p) => p.name);
        // Reels/video fuera del mix (B4): si el modelo los mete igual, se sacan y se renormaliza.
        const { mix: contentMix } = stripReelsFromMix(
          j.contentMix.map((m) => ({ type: asString(m.type), percentage: Number(m.percentage) || 0 })).filter((m) => m.type)
        );
        const channels = asArray(j.recommendedChannels)
          .map((c) => asChannel(c, "Instagram"))
          .filter((c, i, arr) => arr.indexOf(c) === i);

        return {
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
      },
      "IA no disponible, se usó modo demo"
    );
  },
};
