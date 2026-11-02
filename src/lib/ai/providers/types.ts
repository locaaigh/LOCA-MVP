import type { ImageFormat } from "@/lib/types";

export type TextProviderId = "openai" | "anthropic";
export type ImageProviderId = "openai" | "gemini";

/** Profundidad de razonamiento (reemplaza a temperature en Claude 5.5). */
export type Effort = "low" | "medium" | "high";

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  /** Tokens servidos desde caché (facturados ~0,1x). */
  cacheReadTokens?: number;
}

export interface InputImage {
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  /** base64 sin prefijo data: */
  data: string;
}

export interface TextGenOptions {
  onUsage?: (usage: TokenUsage) => void;
  /** Override del modelo (modelo por agente, ver models.ts). */
  model?: string;
  /** low | medium | high. Solo para modelos Claude 5.5+. Si se omite, default del proveedor. */
  effort?: Effort;
  /**
   * 0..1. Para modelos que la aceptan (claude-sonnet-4-6, nuestro productivo).
   * Los 5.5 la rechazan → ahí se usa `effort`. anthropic-text.ts decide según el modelo.
   */
  temperature?: number;
  /**
   * Bloque estable del prompt (contexto del negocio) marcado como cacheable.
   * Se antepone al user message. Con Anthropic activa prompt caching
   * (cache_control ephemeral); con OpenAI simplemente se concatena.
   */
  cachePrefix?: string;
  /** Imágenes de entrada (visión): QA de imágenes, lectura visual de la web. */
  images?: InputImage[];
  maxTokens?: number;
}

export interface TextProvider {
  id: TextProviderId;
  model: string;
  isConfigured: () => boolean;
  chatJson: (system: string, user: string, opts?: TextGenOptions) => Promise<unknown>;
}

// ── Imágenes ─────────────────────────────────────────────────

export type ImageReferenceRole = "product" | "person" | "mascot";

export interface ImageReference {
  data: Buffer;
  mimeType: string;
  role: ImageReferenceRole;
  label?: string;
}

export interface ImageGenerateInput {
  prompt: string;
  aspect: ImageFormat;
  model: string;
  /** Gemini: tier del lado mayor (2K para 1080 px nativos). */
  sizeTier?: "1K" | "2K";
  /** OpenAI: quality. */
  quality?: "low" | "medium" | "high" | "xhigh";
  /** Fotos del cliente (producto, persona, mascota) en orden: la primera es la principal. */
  references?: ImageReference[];
  timeoutMs?: number;
}

export interface ImageGenerateOutput {
  bytes: Buffer;
  mimeType: string;
  model: string;
  usage?: { inputTokens: number; outputTokens: number };
}

export type ImageErrorKind =
  | "moderation_blocked"
  | "rate_limit"
  | "timeout"
  | "invalid_request"
  | "auth"
  | "no_image"
  | "unknown";

export class ImageProviderError extends Error {
  kind: ImageErrorKind;
  retryable: boolean;
  constructor(message: string, kind: ImageErrorKind, retryable = false) {
    super(message);
    this.name = "ImageProviderError";
    this.kind = kind;
    this.retryable = retryable;
  }
}

export interface ImageProvider {
  id: ImageProviderId;
  /** Modelo por defecto del proveedor (legacy / status). */
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
