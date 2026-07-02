import type { ImageFormat } from "@/lib/types";
import { brandedPlaceholder } from "@/lib/placeholder";
import { getImageProvider } from "../providers";
import type { Agent } from "../shared/result";

export interface ImageAgentInput {
  prompt: string;
  format: ImageFormat;
  label?: string;
  concept?: string;
}

export interface ImageAgentOutput {
  imageUrl: string;
  prompt: string;
  provider: "openai" | "gemini" | "mock";
  status: "generada" | "error";
  error?: string;
}

export const imageAgent: Agent<ImageAgentInput, ImageAgentOutput> = {
  id: "image",

  async run({ prompt, format, label, concept }) {
    const imageProvider = getImageProvider();
    if (!imageProvider) {
      return {
        data: {
          imageUrl: brandedPlaceholder({ format, label, concept: "Modo demo: imagen simulada" }),
          prompt,
          provider: "mock",
          status: "generada",
        },
        meta: { provider: "mock" },
      };
    }
    try {
      const { imageUrl } = await imageProvider.generate({ prompt, format });
      return {
        data: { imageUrl, prompt, provider: imageProvider.id, status: "generada" },
        meta: { provider: imageProvider.id },
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        data: {
          imageUrl: brandedPlaceholder({ format, label, concept: "Error al generar imagen" }),
          prompt,
          provider: "mock",
          status: "error",
          error: msg,
        },
        meta: { provider: "mock", warning: msg },
      };
    }
  },
};
