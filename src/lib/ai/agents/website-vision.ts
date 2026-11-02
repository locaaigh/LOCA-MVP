// ─────────────────────────────────────────────────────────────
// Plan B de lectura de la web: capturas de pantalla + modelo de visión.
// Corre cuando el HTML no alcanza (sitio renderizado con JavaScript, texto
// pobre, industria insegura, sin productos) o cuando se lo pide explícito.
// Extrae lo mismo que el análisis por HTML MÁS logo, paleta y tipografías
// observadas en pantalla. Solo completa lo que falta o tiene confianza baja.
// ─────────────────────────────────────────────────────────────
import type { BrandColor, Confidence, WebsiteAnalysis } from "@/lib/types";
import { SYSTEM_EVA, websiteVisionPrompt } from "../prompts";
import { asArray, asString } from "../shared/normalize";
import { websiteAnalysisOutputSchema } from "../shared/schemas";
import type { Agent, AgentResult } from "../shared/result";
import type { InputImage } from "../providers/types";
import { buildBasicAnalysis, fetchWebsite, type RawWebContent } from "../website";
import { captureWebsite } from "../website-screenshot";
import { downscaleForVision } from "../image/raster";
import { withTextAgent } from "./_shared";
import { mergeAiIntoAnalysis } from "./website-extract";

export interface WebsiteVisionAgentInput {
  url: string;
  /** Contenido ya descargado (evita volver a hacer fetch). */
  raw?: RawWebContent;
  /** Análisis previo por HTML sobre el que se completa. */
  analysis?: WebsiteAnalysis;
}

const MAX_SHOTS = 4;
const ROLE_OK = new Set(["primary", "secondary", "accent", "background", "text"]);

function internalPages(raw: RawWebContent): string[] {
  const read = raw.pagesRead.filter((p) => p && p !== raw.url);
  if (read.length) return read.slice(0, MAX_SHOTS - 1);
  return raw.internalLinks
    .filter((l) => /\/(about|nosotros|quienes|servicios|services|productos|products|tienda|shop|menu|carta|precios|planes|contacto)/i.test(l))
    .slice(0, MAX_SHOTS - 1);
}

/** Aplica lo visual (logo, colores, fuentes, productos vistos) solo donde el brand kit está vacío o inferido. */
function applyVisualFindings(analysis: WebsiteAnalysis, j: Record<string, unknown>): WebsiteAnalysis {
  const ff = analysis.foundFields;
  const bk = ff.brandKit;
  if (bk) {
    const colors = Array.isArray(j.colorsSeen) ? (j.colorsSeen as Array<Record<string, unknown>>) : [];
    const valid = colors
      .map((c) => ({ hex: asString(c.hex).trim(), role: asString(c.role, "other"), name: asString(c.name) }))
      .filter((c) => /^#[0-9a-f]{6}$/i.test(c.hex));
    const detectedCount = bk.colors.palette.filter((c) => c.source === "detected" && c.confidence !== "low").length;
    if (valid.length && detectedCount === 0) {
      bk.colors.palette = valid.slice(0, 6).map<BrandColor>((c) => ({
        name: c.name || c.role,
        hex: c.hex.toLowerCase(),
        role: (ROLE_OK.has(c.role) ? c.role : "other") as BrandColor["role"],
        source: "inferred",
        confidence: "medium",
      }));
      const byRole = (r: string) => bk.colors.palette.find((c) => c.role === r)?.hex;
      bk.colors.primary = byRole("primary") ?? bk.colors.primary;
      bk.colors.secondary = byRole("secondary") ?? bk.colors.secondary;
      bk.colors.accent = byRole("accent") ?? bk.colors.accent;
      bk.colors.background = byRole("background") ?? bk.colors.background;
      bk.colors.text = byRole("text") ?? bk.colors.text;
      analysis.fieldStatuses.brandColors = { status: "suggested", confidence: "medium", source: "eva" };
    }
    const fonts = j.fontsSeen as Record<string, Record<string, unknown>> | undefined;
    const fam = (k: "heading" | "body") => asString(fonts?.[k]?.family).trim();
    if (fam("heading") && !bk.typography.heading?.family) bk.typography.heading = { family: fam("heading"), source: "inferred", confidence: "medium" };
    if (fam("body") && !bk.typography.body?.family) bk.typography.body = { family: fam("body"), source: "inferred", confidence: "medium" };
    const logo = asString(j.logoDescription).trim();
    if (logo) {
      bk.visualStyle ||= { mood: [] };
      bk.visualStyle.designNotes = [bk.visualStyle.designNotes, `Logo (visto en pantalla): ${logo}${asString(j.logoText) ? ` · texto "${asString(j.logoText)}"` : ""}`]
        .filter(Boolean)
        .join(" · ");
    }
  }
  const seen = Array.isArray(j.productsSeen) ? (j.productsSeen as Array<Record<string, unknown>>) : [];
  if (seen.length && !ff.productsServices?.length) {
    ff.productsServices = seen
      .map((p) => ({
        name: asString(p.name),
        type: p.type === "servicio" ? ("servicio" as const) : ("producto" as const),
        category: "",
        shortDescription: "",
        price: Number(p.price) || undefined,
        currency: asString(p.currency) || undefined,
        source: "suggested",
        confidence: "medium" as Confidence,
        shouldReview: true,
        isTopSeller: false,
      }))
      .filter((p) => p.name);
    if (ff.productsServices.length) analysis.fieldStatuses.productsServices = { status: "suggested", confidence: "medium", source: "eva" };
  }
  return analysis;
}

export const websiteVisionAgent: Agent<WebsiteVisionAgentInput, WebsiteAnalysis> = {
  id: "website-vision",

  async run({ url, raw: rawIn, analysis }): Promise<AgentResult<WebsiteAnalysis>> {
    const raw = rawIn ?? (await fetchWebsite(url));
    const base = analysis ?? buildBasicAnalysis(raw, url);
    const capture = await captureWebsite(url, internalPages(raw));
    if (!capture || !capture.shots.length) {
      return {
        data: base,
        meta: {
          provider: "mock",
          warning: capture
            ? `Lectura visual sin capturas (${capture.warnings.join("; ") || "el proveedor no devolvió imágenes"}).`
            : "Lectura visual no disponible: configurá BROWSERLESS_URL, SCREENSHOT_URL_TEMPLATE o instalá puppeteer-core + @sparticuz/chromium.",
        },
      };
    }
    const images: InputImage[] = [];
    for (const shot of capture.shots.slice(0, MAX_SHOTS)) {
      const small = await downscaleForVision(shot.bytes, 1568);
      images.push({ mediaType: small.mimeType === "image/png" ? "image/png" : "image/jpeg", data: small.bytes.toString("base64") });
    }
    const textHint = capture.renderedText || raw.text || "";

    const result = await withTextAgent(
      "website-vision",
      () => base,
      async (chatJson) => {
        const j = (await chatJson(
          SYSTEM_EVA,
          websiteVisionPrompt({ url, pages: capture.shots.map((s) => s.page), textHint }),
          { images, schema: websiteAnalysisOutputSchema }
        )) as Record<string, unknown>;
        const merged = mergeAiIntoAnalysis(base, j, { fillOnly: !!analysis });
        const withVisual = applyVisualFindings(merged, j);
        withVisual.mode = "ai";
        withVisual.summary.whatEvaUnderstood = asString(j.whatEvaUnderstood, withVisual.summary.whatEvaUnderstood);
        if (!withVisual.foundFields.values?.length) withVisual.foundFields.values = asArray(j.values);
        return withVisual;
      },
      "Eva no pudo leer la web con capturas"
    );
    if (capture.warnings.length && result.meta.provider !== "mock") {
      result.meta.warning = [result.meta.warning, ...capture.warnings].filter(Boolean).join(" | ");
    }
    return result;
  },
};
