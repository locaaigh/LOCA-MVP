// ─────────────────────────────────────────────────────────────
// Proveedor de imagen Gemini (Nano Banana 2.1 / 2 / Pro).
// Verificado el 25-10-2026 con @google/genai 2.10:
//   imageConfig.aspectRatio "4:5" + imageSize "2K" → JPEG 1856x2304
//   imageConfig.aspectRatio "9:16" + imageSize "2K" → JPEG 1536x2752
//   referencias como inlineData antes del texto → aceptadas (1120 tokens c/u)
// El 1.91:1 de LinkedIn no existe en Gemini: se pide 16:9 y se recorta después.
// ─────────────────────────────────────────────────────────────
import { GoogleGenAI } from "@google/genai";
import type { ImageFormat } from "@/lib/types";
import { ImageProviderError, type ImageProvider, type ImageGenerateInput, type ImageGenerateOutput } from "./types";

// ADAPTACIÓN LOCA: nuestro modelo productivo de imagen es gemini-3-pro-image
// ("Nano Banana Pro"), misma API generateContent + imageConfig que Sebi verificó.
export const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3-pro-image";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new ImageProviderError("Falta GEMINI_API_KEY", "auth");
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

export function hasGeminiImage(): boolean {
  return !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
}

function geminiAspect(aspect: ImageFormat): string {
  switch (aspect) {
    case "4:5":
      return "4:5";
    case "9:16":
      return "9:16";
    case "1.91:1":
      return "16:9"; // se recorta ~7% de ancho en raster.ts
    default:
      return "1:1";
  }
}

export function friendlyGeminiError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/429|quota|RESOURCE_EXHAUSTED/i.test(msg)) {
    return "Cuota de Gemini agotada. Activá facturación en Google AI Studio o configurá OPENAI_API_KEY para imágenes.";
  }
  if (/401|403|API key|PERMISSION_DENIED/i.test(msg)) {
    return "API key de Gemini inválida o sin permisos para generar imágenes.";
  }
  return msg || "Error al generar imagen con Gemini";
}

function classify(e: unknown): ImageProviderError {
  if (e instanceof ImageProviderError) return e;
  const msg = e instanceof Error ? e.message : String(e);
  if (/timeout|timed out/i.test(msg)) return new ImageProviderError(msg, "timeout", true);
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(msg)) return new ImageProviderError(friendlyGeminiError(e), "rate_limit", true);
  if (/401|403|API key|PERMISSION_DENIED/i.test(msg)) return new ImageProviderError(friendlyGeminiError(e), "auth", false);
  if (/SAFETY|PROHIBITED|blocked|IMAGE_SAFETY/i.test(msg)) return new ImageProviderError(msg, "moderation_blocked", false);
  if (/5\d\d|UNAVAILABLE|fetch failed|ECONNRESET/i.test(msg)) return new ImageProviderError(msg, "unknown", true);
  return new ImageProviderError(msg, "unknown", false);
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ImageProviderError(`Gemini timeout tras ${ms / 1000}s`, "timeout", true)), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const MAX_ATTEMPTS = 2;

interface GeminiResponseLike {
  candidates?: Array<{
    finishReason?: string;
    content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string }; text?: string }> };
  }>;
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

function extractImage(res: GeminiResponseLike): { data: string; mimeType: string } | null {
  for (const part of res.candidates?.[0]?.content?.parts ?? []) {
    if (part.inlineData?.data) return { data: part.inlineData.data, mimeType: part.inlineData.mimeType || "image/png" };
  }
  return null;
}

export const geminiImageProvider: ImageProvider = {
  id: "gemini",
  model: GEMINI_IMAGE_MODEL,
  isConfigured: hasGeminiImage,
  async generate(input: ImageGenerateInput): Promise<ImageGenerateOutput> {
    const ai = getClient();
    const model = input.model || GEMINI_IMAGE_MODEL;
    const parts: Array<{ inlineData: { mimeType: string; data: string } } | { text: string }> = [];
    for (const ref of input.references ?? []) {
      parts.push({ inlineData: { mimeType: ref.mimeType, data: ref.data.toString("base64") } });
    }
    parts.push({ text: input.prompt });
    const timeoutMs = input.timeoutMs ?? 75_000;

    let lastErr: ImageProviderError | undefined;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const res = (await withTimeout(
          ai.models.generateContent({
            model,
            contents: [{ role: "user", parts }],
            config: {
              responseModalities: ["IMAGE"],
              imageConfig: { aspectRatio: geminiAspect(input.aspect), imageSize: input.sizeTier ?? "2K" },
            },
          }),
          timeoutMs
        )) as GeminiResponseLike;
        const img = extractImage(res);
        if (!img) {
          const reason = res.promptFeedback?.blockReason || res.candidates?.[0]?.finishReason || "sin imagen";
          const blocked = /SAFETY|PROHIBITED|BLOCK|IMAGE_SAFETY/i.test(reason);
          throw new ImageProviderError(
            blocked ? `Gemini bloqueó la generación (${reason})` : `Gemini no devolvió imagen (${reason})`,
            blocked ? "moderation_blocked" : "no_image",
            !blocked
          );
        }
        return {
          bytes: Buffer.from(img.data, "base64"),
          mimeType: img.mimeType,
          model,
          usage: {
            inputTokens: res.usageMetadata?.promptTokenCount ?? 0,
            outputTokens: res.usageMetadata?.candidatesTokenCount ?? 0,
          },
        };
      } catch (e) {
        lastErr = classify(e);
        if (attempt < MAX_ATTEMPTS && lastErr.retryable) {
          await delay(2000 * attempt);
          continue;
        }
        break;
      }
    }
    throw lastErr ?? new ImageProviderError("Error desconocido de Gemini", "unknown");
  },
};
