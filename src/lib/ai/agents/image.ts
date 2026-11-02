import type { Business, ContentItem, ImageFormat } from "@/lib/types";
import { brandedPlaceholder } from "@/lib/placeholder";
import type { Agent, AgentResult } from "../shared/result";
import type { GenerationMeta } from "../types";
import { generatePieceImage } from "../image/pipeline";
import { toDataUrl } from "../image/raster";
import { imageProvidersAvailable } from "../providers";

export interface ImageAgentInput {
  business: Business;
  content: ContentItem;
  /** Índice de la pieza en el mes (rotación de variantes). Si no viene, se deriva del id. */
  pieceIndex?: number;
  /** Concepto nuevo (regeneración con feedback). */
  conceptOverride?: string;
}

export interface ImageAgentOutput {
  /** data URL (la ruta la sube a Storage y la reemplaza por URL pública). */
  imageUrl: string;
  /** Prompt FINAL que recibió el modelo (7 capas). */
  prompt: string;
  provider: "openai" | "gemini" | "mock";
  status: "generada" | "error";
  error?: string;
  generation: GenerationMeta;
  width?: number;
  height?: number;
  mimeType?: string;
  warnings: string[];
}

function stableIndex(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 10;
}

/**
 * Imagen de la pieza vía pipeline (estilo → referencias → ruteo → QA → resize → overlay).
 * Sin proveedor configurado → placeholder de marca (modo demo), igual que antes.
 */
export const imageAgent: Agent<ImageAgentInput, ImageAgentOutput> = {
  id: "image",

  async run({ business, content, pieceIndex, conceptOverride }): Promise<AgentResult<ImageAgentOutput>> {
    const format: ImageFormat = content.imageFormat || "4:5";
    const available = imageProvidersAvailable();
    if (!available.gemini && !available.openai) {
      const placeholder = brandedPlaceholder({ format, label: business.name, concept: "Modo demo: imagen simulada" });
      const generation: GenerationMeta = {
        useCase: "photo_style",
        family: "fotografia",
        concept: content.visualConcept,
        prompt: content.imagePrompt || content.visualConcept,
        model: "mock",
        provider: "mock",
        attempts: [{ model: "mock", provider: "mock", outcome: "mock" }],
        costUsd: 0,
        overlayApplied: false,
        references: { product: 0, person: 0 },
        aspect: format,
        isMock: true,
        createdAt: new Date().toISOString(),
        events: [],
      };
      return {
        data: { imageUrl: placeholder, prompt: generation.prompt, provider: "mock", status: "generada", generation, warnings: [] },
        meta: { provider: "mock" },
      };
    }

    const r = await generatePieceImage({
      business,
      content,
      pieceIndex: pieceIndex ?? stableIndex(content.id),
      conceptOverride,
    });
    if (r.status === "generada" && r.bytes) {
      return {
        data: {
          imageUrl: toDataUrl(r.bytes, r.mimeType || "image/jpeg"),
          prompt: r.generation.prompt,
          provider: r.generation.provider === "openai" || r.generation.provider === "gemini" ? r.generation.provider : "mock",
          status: "generada",
          generation: r.generation,
          width: r.width,
          height: r.height,
          mimeType: r.mimeType,
          warnings: r.warnings,
        },
        meta: r.meta,
      };
    }
    return {
      data: {
        imageUrl: brandedPlaceholder({ format, label: business.name, concept: "Error al generar imagen" }),
        prompt: r.generation.prompt,
        provider: "mock",
        status: "error",
        error: r.error,
        generation: r.generation,
        warnings: r.warnings,
      },
      meta: r.meta,
    };
  },
};
