import type { Business, CalendarItem, Strategy } from "@/lib/types";
import { nowIso, uid } from "@/lib/utils";
import { mockCalendar } from "../mock";
import { SYSTEM_EVA, calendarPrompt } from "../prompts";
import { asChannel, asFormat, asString } from "../shared/normalize";
import { calendarOutputSchema } from "../shared/schemas";
import { gateFormat } from "../shared/validators";
import type { Agent, AgentResult } from "../shared/result";
import type { PiecePurpose } from "../types";
import { withTextAgent } from "./_shared";

export interface CalendarAgentInput {
  business: Business;
  strategy: Strategy;
  count: number;
  feedback?: string;
}

/**
 * Calendario = brief por pieza (A3-D2, opción c): además de fecha/canal/formato/tema,
 * cada ítem trae propósito, ángulo, idea de hook y concepto visual, distintos entre sí.
 * Formatos apagados (reel, carrusel por flag) caen a post_estatico y quedan en meta.warning.
 */
export const calendarAgent: Agent<CalendarAgentInput, CalendarItem[]> = {
  id: "calendar",

  async run({ business, strategy, count, feedback }): Promise<AgentResult<CalendarItem[]>> {
    const fallback = mockCalendar(business, strategy, count).map((c) => ({ ...c, format: gateFormat(c.format).format }));
    const blocked: string[] = [];
    const result = await withTextAgent(
      "calendar",
      () => fallback,
      async (chatJson) => {
        const j = await chatJson(SYSTEM_EVA, calendarPrompt(business, strategy, count, feedback), { schema: calendarOutputSchema });
        const today = new Date();
        const seenHooks = new Set<string>();
        return j.items.slice(0, count).map((o, i) => {
          const off = Math.max(1, Math.min(30, Number(o.dayOffset) || i + 1));
          const d = new Date(today);
          d.setDate(today.getDate() + off);
          const gated = gateFormat(asFormat(o.format, "post_estatico"));
          if (gated.blocked) blocked.push(gated.blocked);
          // Hooks repetidos entre piezas: se marcan para que el contenido los esquive.
          const hookKey = asString(o.hookIdea).toLowerCase().replace(/\W+/g, " ").trim();
          const hookIdea = hookKey && seenHooks.has(hookKey) ? "" : asString(o.hookIdea);
          if (hookKey) seenHooks.add(hookKey);
          const purpose = o.purpose as PiecePurpose;
          return {
            id: uid("cal"),
            businessId: business.id,
            strategyId: strategy.id,
            date: d.toISOString().slice(0, 10),
            suggestedTime: asString(o.suggestedTime, "18:00"),
            channel: asChannel(o.channel, strategy.recommendedChannels[0] || "Instagram"),
            format: gated.format,
            contentPillar: asString(o.contentPillar, strategy.contentPillars[0]?.name || "General"),
            objective: asString(o.objective, "Alcance"),
            topic: asString(o.topic, "Idea de contenido"),
            purpose,
            angle: asString(o.angle),
            hookIdea,
            visualConcept: asString(o.visualConcept),
            needsTextOverlay: o.needsTextOverlay || ["educativo", "promo", "testimonio", "fecha_especial"].includes(purpose),
            status: "generado" as const,
            createdAt: nowIso(),
            updatedAt: nowIso(),
          };
        });
      },
      "IA no disponible, calendario en modo demo"
    );
    if (blocked.length) {
      result.meta.warning = [result.meta.warning, `Formatos convertidos a post estático: ${blocked.join(", ")} (format_blocked)`]
        .filter(Boolean)
        .join(" | ");
    }
    return result;
  },
};
