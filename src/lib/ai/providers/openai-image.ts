import OpenAI from "openai";
import { openAiSize } from "@/lib/placeholder";
import type { ImageProvider } from "./types";

export const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

export function hasOpenAIImage(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export const openaiImageProvider: ImageProvider = {
  id: "openai",
  model: OPENAI_IMAGE_MODEL,
  isConfigured: hasOpenAIImage,
  async generate({ prompt, format }) {
    const res = await getClient().images.generate({
      model: OPENAI_IMAGE_MODEL,
      prompt: `${prompt}\n\nImportante: sin texto incrustado, composición limpia, calidad profesional para redes sociales.`,
      size: openAiSize(format) as unknown as "1024x1024" | "1792x1024" | "1024x1792",
      n: 1,
    });
    const b64 = res.data?.[0]?.b64_json;
    const url = res.data?.[0]?.url;
    if (b64) return { imageUrl: `data:image/png;base64,${b64}` };
    if (url) return { imageUrl: url };
    throw new Error("respuesta de imagen vacía");
  },
};
