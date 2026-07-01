import type { ImageFormat } from "@/lib/types";

export type TextProviderId = "openai" | "anthropic";
export type ImageProviderId = "openai";

export interface TextProvider {
  id: TextProviderId;
  model: string;
  isConfigured: () => boolean;
  chatJson: (system: string, user: string) => Promise<unknown>;
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
