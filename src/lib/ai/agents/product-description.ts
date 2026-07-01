import type { Business, ProductDescriptionSuggestion, ProductService } from "@/lib/types";
import { SYSTEM_EVA, productDescriptionPrompt } from "../prompts";
import { asArray, asString } from "../shared/normalize";
import type { Agent, AgentResult } from "../shared/result";
import { withTextAgent } from "./_shared";

export interface ProductDescriptionAgentInput {
  business: Business;
  draft: ProductService;
}

function mockProductDescription(
  b: Business,
  draft: ProductService
): ProductDescriptionSuggestion {
  const n = draft.name || (draft.type === "servicio" ? "este servicio" : "este producto");
  return {
    shortDescription: `${n}: ${draft.type === "servicio" ? "una solución pensada para vos" : "calidad y detalle en cada pieza"}, de ${b.name}.`,
    longDescription: `${n} de ${b.name}. ${
      b.shortDescription || "Hecho con dedicación"
    }. ${b.competitiveAdvantages[0] ? `Se destaca por ${b.competitiveAdvantages[0].toLowerCase()}.` : ""}`.trim(),
    features:
      draft.features.length > 0
        ? draft.features
        : ["Calidad cuidada", "Atención cercana", b.values[0] || "Hecho con dedicación"],
    keywords: [draft.name, draft.category, b.subcategory, b.industry]
      .filter(Boolean)
      .map((k) => String(k).toLowerCase())
      .slice(0, 6),
  };
}

export const productDescriptionAgent: Agent<
  ProductDescriptionAgentInput,
  ProductDescriptionSuggestion
> = {
  id: "product-description",

  async run({ business, draft }): Promise<AgentResult<ProductDescriptionSuggestion>> {
    const fb = mockProductDescription(business, draft);
    return withTextAgent(
      () => fb,
      async (chatJson) => {
        const j = (await chatJson(
          SYSTEM_EVA,
          productDescriptionPrompt(business, draft)
        )) as Record<string, unknown>;
        return {
          shortDescription: asString(j.shortDescription, fb.shortDescription),
          longDescription: asString(j.longDescription, fb.longDescription),
          features: asArray(j.features).length ? asArray(j.features) : fb.features,
          keywords: asArray(j.keywords).length ? asArray(j.keywords) : fb.keywords,
        };
      }
    );
  },
};
