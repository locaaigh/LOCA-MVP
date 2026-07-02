import { GoogleGenAI } from "@google/genai";
import type { ImageFormat } from "@/lib/types";
import type { ImageProvider } from "./types";

export const GEMINI_IMAGE_MODEL =
  process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("Falta GEMINI_API_KEY");
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

export function hasGeminiImage(): boolean {
  return !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
}

function aspectRatio(format: ImageFormat): string {
  switch (format) {
    case "4:5":
      return "4:5";
    case "9:16":
      return "9:16";
    default:
      return "1:1";
  }
}

function imageSuffix(): string {
  return "\n\nImportante: sin texto incrustado, composición limpia, calidad profesional para redes sociales.";
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

function extractInlineImage(response: {
  candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> } }>;
}): string | null {
  for (const part of response.candidates?.[0]?.content?.parts ?? []) {
    const data = part.inlineData?.data;
    if (data) {
      const mime = part.inlineData?.mimeType || "image/png";
      return `data:${mime};base64,${data}`;
    }
  }
  return null;
}

async function generateViaContent(ai: GoogleGenAI, prompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: GEMINI_IMAGE_MODEL,
    contents: prompt,
    config: { responseModalities: ["IMAGE"] },
  });
  const url = extractInlineImage(response);
  if (!url) throw new Error("Gemini no devolvió imagen (generateContent)");
  return url;
}

async function generateViaInteractions(
  ai: GoogleGenAI,
  prompt: string,
  format: ImageFormat
): Promise<string> {
  const interaction = await ai.interactions.create({
    model: GEMINI_IMAGE_MODEL,
    input: prompt,
    response_format: {
      type: "image",
      aspect_ratio: aspectRatio(format),
    },
  });
  const image = interaction.output_image;
  if (!image?.data) throw new Error("Gemini no devolvió imagen (interactions)");
  const mime = image.mime_type || "image/png";
  return `data:${mime};base64,${image.data}`;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isRetryable(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /429|RESOURCE_EXHAUSTED|quota|5\d\d|timeout|timed out|fetch failed|ECONNRESET|UNAVAILABLE/i.test(
    msg
  );
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Gemini timeout tras ${ms / 1000}s`)), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

const ATTEMPT_TIMEOUT_MS = 25_000;
const MAX_ATTEMPTS = 2;

export const geminiImageProvider: ImageProvider = {
  id: "gemini",
  model: GEMINI_IMAGE_MODEL,
  isConfigured: hasGeminiImage,
  async generate({ prompt, format }) {
    const ai = getClient();
    const fullPrompt = `${prompt}${imageSuffix()}`;

    // Reintentos con backoff: Gemini a veces da 429/5xx transitorios.
    let lastErr: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return {
          imageUrl: await withTimeout(generateViaContent(ai, fullPrompt), ATTEMPT_TIMEOUT_MS),
        };
      } catch (e) {
        lastErr = e;
        if (attempt < MAX_ATTEMPTS && isRetryable(e)) {
          await delay(2000 * attempt);
        } else {
          break;
        }
      }
    }

    // Último recurso: la API de interactions (formato alternativo).
    try {
      return {
        imageUrl: await withTimeout(
          generateViaInteractions(ai, fullPrompt, format),
          ATTEMPT_TIMEOUT_MS
        ),
      };
    } catch (interactionErr) {
      throw new Error(friendlyGeminiError(lastErr ?? interactionErr));
    }
  },
};
