import type { Business, CalendarItem, Strategy } from "@/lib/types";
import { nowIso, uid } from "@/lib/utils";
import { mockCalendar } from "../mock";
import { SYSTEM_EVA, calendarPrompt } from "../prompts";
import { asChannel, asFormat, asString } from "../shared/normalize";
import type { Agent, AgentResult } from "../shared/result";
import { withTextAgent } from "./_shared";

export interface CalendarAgentInput {
  business: Business;
  strategy: Strategy;
  count: number;
  feedback?: string;
}

export const calendarAgent: Agent<CalendarAgentInput, CalendarItem[]> = {
  id: "calendar",

  async run({ business, strategy, count, feedback }): Promise<AgentResult<CalendarItem[]>> {
    const fallback = mockCalendar(business, strategy, count);
    return withTextAgent(
      () => fallback,
      async (chatJson) => {
        const j = (await chatJson(
          SYSTEM_EVA,
          calendarPrompt(business, strategy, count, feedback)
        )) as Record<string, unknown>;
        const items = Array.isArray(j.items) ? j.items : [];
        if (!items.length) throw new Error("sin items");
        const today = new Date();
        return items.slice(0, count).map((it: unknown, i: number) => {
          const o = it as Record<string, unknown>;
          const off = Math.max(1, Math.min(30, Number(o.dayOffset) || i + 1));
          const d = new Date(today);
          d.setDate(today.getDate() + off);
          return {
            id: uid("cal"),
            businessId: business.id,
            strategyId: strategy.id,
            date: d.toISOString().slice(0, 10),
            suggestedTime: asString(o.suggestedTime, "18:00"),
            channel: asChannel(o.channel, strategy.recommendedChannels[0] || "Instagram"),
            format: asFormat(o.format, "post_estatico"),
            contentPillar: asString(
              o.contentPillar,
              strategy.contentPillars[0]?.name || "General"
            ),
            objective: asString(o.objective, "Alcance"),
            topic: asString(o.topic, "Idea de contenido"),
            status: "generado" as const,
            createdAt: nowIso(),
            updatedAt: nowIso(),
          };
        });
      },
      "IA no disponible, calendario en modo demo"
    );
  },
};
