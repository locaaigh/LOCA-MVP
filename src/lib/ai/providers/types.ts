import type { ImageFormat } from "@/lib/types";

export type TextProviderId = "openai" | "anthropic";
export type ImageProviderId = "openai" | "gemini";

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface TextGenOptions {
  onUsage?: (usage: TokenUsage) => void;
  /** Override del modelo (modelo por agente, ver models.ts). */
  model?: string;
  /** 0..1. Si se omite, default del proveedor. */
  temperature?: number;
  /**
   * Bloque estable del prompt (contexto del negocio) marcado como cacheable.
   * Se antepone al user message. Con Anthropic activa prompt caching
   * (cache_control ephemeral); con OpenAI simplemente se concatena y el
   * caching automático del proveedor lo aprovecha.
   */
  cachePrefix?: string;
}

export interface TextProvider {
  id: TextProviderId;
  model: string;
  isConfigured: () => boolean;
  chatJson: (
    system: string,
    user: string,
    opts?: TextGenOptions
  ) => Promise<unknown>;
}

export interface ImageGenerateInput {
  prompt: string;
  format: ImageFormat;
}

export interface ImageGenerateOutput {
  imageUrl: string;
}

export interface ImageProvider {
  id: ImageProviderId;
  model: string;
  isConfigured: () => boolean;
  generate: (input: ImageGenerateInput) => Promise<ImageGenerateOutput>;
}

export interface AiRuntimeStatus {
  textProvider: TextProviderId | "none";
  textModel: string;
  imageProvider: ImageProviderId | "none";
  imageModel: string;
  hasTextAI: boolean;
  hasImageAI: boolean;
}
