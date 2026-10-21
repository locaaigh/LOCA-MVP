import type { Confidence, WebsiteAnalysis } from "@/lib/types";
import {
  SEASONALITY_OPTIONS_DEFAULT,
  SPECIAL_DATES_OPTIONS_DEFAULT,
  INDUSTRY_SEASONALITY,
  INDUSTRY_SPECIAL_DATES,
} from "@/lib/constants";
import { fetchWebsite, buildBasicAnalysis, type RawWebContent } from "../website";
import { getTextProvider } from "../providers";
import { estimateTextCostUsd } from "../pricing";
import { getAgentConfig } from "../models";
import type { TokenUsage } from "../providers/types";
import { SYSTEM_EVA, websiteAnalysisPrompt } from "../prompts";
import { asArray, asString } from "../shared/normalize";
import type { Agent, AgentResult } from "../shared/result";

export interface WebsiteExtractAgentInput {
  url: string;
}

async function analyzeWebsiteContentWithAI(
  raw: RawWebContent,
  onUsage?: (u: TokenUsage) => void
): Promise<Record<string, unknown>> {
  const provider = getTextProvider();
  if (!provider) throw new Error("sin proveedor de texto");
  const cfg = getAgentConfig("website-extract");
  return (await provider.chatJson(
    SYSTEM_EVA,
    websiteAnalysisPrompt({
      url: raw.url,
      title: raw.title,
      description: raw.metaDescription || raw.ogDescription,
      headings: raw.headings,
      paragraphs: raw.paragraphs,
      buttons: raw.buttons,
      socials: raw.socialLinks.map((s) => s.platform),
      text: raw.text,
    }),
    { onUsage, model: cfg.model, temperature: cfg.temperature }
  )) as Record<string, unknown>;
}

// ── Sanitizador de avoid-list ────────────────────────────────
// Bug (feedback formulario, ítem 8): fechas/temporadas comerciales como
// "Hot Sale / Cyber Monday" o "Black Friday" se colaban en "cosas a evitar".
// Son opciones legítimas de temporadas/fechas, NO restricciones de marca.
// Además de prohibirlo en el prompt, acá descartamos de avoidList cualquier
// ítem que coincida con una temporada/fecha conocida, sin tocar restricciones
// reales (ej: "No hablar de descuentos" se mantiene).
function normalizeTerm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // saca emojis y puntuación
    .replace(/\s+/g, " ")
    .trim();
}

const DATE_SEASON_TERMS: Set<string> = (() => {
  const all = [
    ...SEASONALITY_OPTIONS_DEFAULT,
    ...SPECIAL_DATES_OPTIONS_DEFAULT,
    ...Object.values(INDUSTRY_SEASONALITY).flat(),
    ...Object.values(INDUSTRY_SPECIAL_DATES).flat(),
  ];
  return new Set(all.map(normalizeTerm).filter(Boolean));
})();

function sanitizeAvoidList(items: string[]): string[] {
  return items.filter((it) => {
    const n = normalizeTerm(it);
    if (!n || n === "otra") return false;
    return !DATE_SEASON_TERMS.has(n);
  });
}

// Confianza por campo que reporta el modelo (j.confidence[key]).
function readConfidence(j: Record<string, unknown>, key: string): Confidence | undefined {
  const c = (j.confidence as Record<string, unknown> | undefined)?.[key];
  return c === "high" || c === "medium" || c === "low" ? c : undefined;
}
// Opciones alternativas que ofrece el modelo cuando no está seguro (j.options[key]).
function readOptions(j: Record<string, unknown>, key: string): string[] {
  return asArray((j.options as Record<string, unknown> | undefined)?.[key]);
}

function mergeAiIntoAnalysis(basic: WebsiteAnalysis, j: Record<string, unknown>): WebsiteAnalysis {
  const ff = basic.foundFields;
  const fs = basic.fieldStatuses;
  const suggest = (
    key: string,
    val: unknown,
    conf: Confidence = "medium",
    options?: string[]
  ) => {
    if (val == null || (Array.isArray(val) && !val.length) || val === "") return;
    if (fs[key]?.status === "found") return;
    (ff as Record<string, unknown>)[key] = val;
    fs[key] = {
      status: "suggested",
      confidence: conf,
      source: "eva",
      ...(options && options.length ? { options } : {}),
    };
    const idx = basic.missingFields.indexOf(key);
    if (idx >= 0) basic.missingFields.splice(idx, 1);
  };

  suggest("industry", asString(j.industry), readConfidence(j, "industry"), readOptions(j, "industry"));
  suggest(
    "subcategory",
    asString(j.subcategory),
    readConfidence(j, "subcategory"),
    readOptions(j, "subcategory")
  );
  suggest("businessType", asString(j.businessType), readConfidence(j, "businessType"));
  suggest(
    "businessModel",
    asString(j.businessModel),
    readConfidence(j, "businessModel"),
    readOptions(j, "businessModel")
  );
  suggest("country", asString(j.country));
  suggest("state", asString(j.state));
  suggest("city", asString(j.city));
  if (asString(j.shortDescription) && fs.shortDescription?.status !== "found")
    suggest("shortDescription", asString(j.shortDescription), readConfidence(j, "shortDescription"));
  suggest("fullDescription", asString(j.fullDescription));
  suggest("values", asArray(j.values));
  suggest("competitiveAdvantages", asArray(j.competitiveAdvantages));
  suggest("marketingActivities", asArray(j.marketingActivities));
  suggest("seasonalityTags", asArray(j.seasonalityTags));
  suggest("specialDates", asArray(j.specialDates));

  if (Array.isArray(j.products) && j.products.length) {
    const productsConf = readConfidence(j, "products") ?? "medium";
    ff.productsServices = (j.products as unknown[])
      .map((p) => {
        const o = p as Record<string, unknown>;
        return {
          name: asString(o.name),
          type: o.type === "servicio" ? ("servicio" as const) : ("producto" as const),
          category: asString(o.category),
          shortDescription: asString(o.shortDescription),
          price: Number(o.price) || undefined,
          currency: asString(o.currency) || undefined,
          source: "suggested",
          confidence: productsConf,
          shouldReview: true,
          isTopSeller: !!o.isTopSeller,
        };
      })
      .filter((p) => p.name);
    if (ff.productsServices?.length)
      fs.productsServices = { status: "suggested", confidence: productsConf, source: "eva" };
  }

  const aud = j.audience as Record<string, unknown> | undefined;
  if (aud && typeof aud === "object") {
    ff.audience = {
      ageRanges: asArray(aud.ageRanges),
      gender: (asString(aud.gender) || "todos") as "todos",
      socioeconomicLevel: (asString(aud.socioeconomicLevel) || "medio") as "medio",
      segments: asArray(aud.segments),
      painPoints: asArray(aud.painPoints),
      behavior: asString(aud.behavior),
    };
    fs.audience = { status: "suggested", confidence: "low", source: "eva" };
  }

  if (ff.brandKit) {
    ff.brandKit.visualStyle ||= { mood: [] };
    const mood = asArray(j.visualMood);
    if (mood.length) ff.brandKit.visualStyle.mood = mood;
    if (asString(j.imageStyle)) ff.brandKit.visualStyle.imageStyle = asString(j.imageStyle);
    if (asString(j.designNotes)) ff.brandKit.visualStyle.designNotes = asString(j.designNotes);
    const tone = asArray(j.toneTags);
    if (tone.length) ff.brandKit.voiceTone.toneTags = tone;
    const formality = asString(j.formality);
    if (["informal", "neutral", "formal"].includes(formality))
      ff.brandKit.voiceTone.formality = formality as "informal" | "neutral" | "formal";
    const kw = asArray(j.brandKeywords);
    if (kw.length) ff.brandKit.brandKeywords = kw;
    // Avoid-list SOLO de señales reales de la web (el prompt prohíbe meter acá
    // fechas/temporadas/promos, y sanitizeAvoidList filtra lo que igual se cuele).
    // Si viene vacío, no tocamos lo que ya hubiera.
    const avoid = sanitizeAvoidList(asArray(j.avoidList));
    if (avoid.length) {
      ff.brandKit.avoidList = Array.from(new Set([...(ff.brandKit.avoidList ?? []), ...avoid]));
      fs.avoidList = { status: "suggested", confidence: "low", source: "eva" };
    }
  }

  if (ff.businessIntelligence) {
    const vps = asArray(j.valuePropositions);
    if (vps.length) {
      ff.businessIntelligence.valuePropositions = vps.map((t) => ({
        text: t,
        source: "suggested" as const,
        confidence: "medium" as Confidence,
      }));
    }
    const goal = asString(j.recommendedGoal);
    if (goal) {
      ff.businessIntelligence.recommendedGoal = {
        goal,
        reason: asString(j.recommendedGoalReason, "Recomendado por Eva según tu web."),
        source: "suggested",
        confidence: "medium",
      };
    }
    const conv = asString(j.primaryConversion);
    if (conv && ff.businessIntelligence.primaryConversion?.confidence !== "high") {
      ff.businessIntelligence.primaryConversion = {
        type: conv,
        source: "suggested",
        confidence: "medium",
      };
    }
  }

  const completed = Object.values(fs).filter((f) => f.status === "found").length;
  const suggested = Object.values(fs).filter((f) => f.status === "suggested").length;
  const review = Object.values(fs).filter((f) => f.status === "review").length;
  const missing = Object.values(fs).filter((f) => f.status === "missing").length;
  const confidence = Math.min(0.95, basic.confidence + 0.15 + suggested * 0.02);
  if (ff.businessIntelligence) ff.businessIntelligence.analysisConfidence = confidence;

  return {
    ...basic,
    mode: "ai",
    confidence,
    summary: {
      whatEvaUnderstood: asString(j.whatEvaUnderstood, basic.summary.whatEvaUnderstood),
      completedFieldsCount: completed,
      missingFieldsCount: missing,
      reviewFieldsCount: review + suggested,
    },
  };
}

export const websiteExtractAgent: Agent<WebsiteExtractAgentInput, WebsiteAnalysis> = {
  id: "website-extract",

  async run({ url }): Promise<AgentResult<WebsiteAnalysis>> {
    const raw = await fetchWebsite(url);
    const basic = buildBasicAnalysis(raw, url);

    if (!raw.reachable) {
      return {
        data: basic,
        meta: {
          provider: "mock",
          warning:
            "Eva no pudo leer la web. Podés completar el formulario manualmente o probar con otra URL.",
        },
      };
    }

    const textProvider = getTextProvider();
    if (!textProvider) {
      return {
        data: basic,
        meta: {
          provider: "mock",
          warning: "Modo demo: Eva solo puede extraer información básica de la web.",
        },
      };
    }

    try {
      let usage: TokenUsage | undefined;
      const ai = await analyzeWebsiteContentWithAI(raw, (u) => (usage = u));
      return {
        data: mergeAiIntoAnalysis(basic, ai),
        meta: {
          provider: textProvider.id,
          model: textProvider.model,
          usage: usage && { ...usage, costUsd: estimateTextCostUsd(textProvider.model, usage) },
        },
      };
    } catch (e: unknown) {
      const detail = e instanceof Error ? e.message : String(e);
      if (process.env.NODE_ENV === "development") {
        console.error("[website-extract] IA falló:", detail);
      }
      return {
        data: basic,
        meta: {
          provider: "mock",
          warning:
            basic.summary.completedFieldsCount > 0
              ? `Eva leyó tu web (${basic.summary.completedFieldsCount} campos detectados) pero no pudo enriquecer todo con IA. Revisá lo que falte.`
              : "Eva no pudo leer tu web. Probá con otra URL o completá a mano.",
        },
      };
    }
  },
};
