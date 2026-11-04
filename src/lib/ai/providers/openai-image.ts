// ─────────────────────────────────────────────────────────────
// Proveedor de imagen OpenAI (gpt-image-2.5-sunburst / -flare) por HTTP
// directo a /v1/images, sin depender de la versión del SDK `openai`
// (la 4.67 instalada no conoce estos modelos ni los tamaños custom).
//
// Guía oficial (leída 2026-10-08): tamaños WIDTHxHEIGHT custom con lados
// múltiplos de 16 → 1088x1360 (4:5), 1152x2048 (9:16), 2048x1072 (1.91:1).
// Referencias: /v1/images/edits (multipart, image[]), el producto como
// primera imagen. `moderation_blocked` se trata como señal de fallback.
//
// ⚠️ NO verificado con llamadas reales en esta entrega: la key disponible
// devolvió 401. Correr scripts/verify-image-models.mjs con una key válida.
// ─────────────────────────────────────────────────────────────
import type { ImageFormat } from "@/lib/types";
import { ImageProviderError, type ImageProvider, type ImageGenerateInput, type ImageGenerateOutput } from "./types";

export const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2.5-flare";
const BASE_URL = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");

export function hasOpenAIImage(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export function openAiSizeFor(aspect: ImageFormat, model: string): string {
  // gpt-image-1 solo acepta 1024x1024, 1024x1536, 1536x1024 (ninguna es 4:5 ni 9:16).
  if (/gpt-image-1\b/.test(model)) {
    return aspect === "1.91:1" ? "1536x1024" : aspect === "1:1" ? "1024x1024" : "1024x1536";
  }
  switch (aspect) {
    case "4:5":
      return "1088x1360";
    case "9:16":
      return "1152x2048";
    case "1.91:1":
      return "2048x1072";
    default:
      return "1024x1024";
  }
}

interface OpenAIImageResponse {
  data?: Array<{ b64_json?: string; url?: string; revised_prompt?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: { message?: string; code?: string; type?: string };
}

function classifyHttp(status: number, body: OpenAIImageResponse | null, raw: string): ImageProviderError {
  const code = body?.error?.code || "";
  const msg = body?.error?.message || raw.slice(0, 300) || `HTTP ${status}`;
  if (/moderation|safety|content_policy/i.test(code) || /moderation|safety system|content policy/i.test(msg)) {
    return new ImageProviderError(`OpenAI bloqueó la generación: ${msg}`, "moderation_blocked", false);
  }
  if (status === 401 || status === 403) return new ImageProviderError("API key de OpenAI inválida o sin permisos para imágenes.", "auth", false);
  if (status === 429) return new ImageProviderError(`OpenAI rate limit: ${msg}`, "rate_limit", true);
  if (status >= 500) return new ImageProviderError(`OpenAI error ${status}: ${msg}`, "unknown", true);
  if (status === 400 || status === 404) return new ImageProviderError(`OpenAI rechazó el pedido: ${msg}`, "invalid_request", false);
  return new ImageProviderError(`OpenAI error ${status}: ${msg}`, "unknown", false);
}

async function call(path: string, body: BodyInit, headers: Record<string, string>, timeoutMs: number): Promise<OpenAIImageResponse> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, ...headers },
      body,
      signal: ctrl.signal,
    });
    const raw = await res.text();
    let json: OpenAIImageResponse | null = null;
    try {
      json = JSON.parse(raw) as OpenAIImageResponse;
    } catch {
      json = null;
    }
    if (!res.ok) throw classifyHttp(res.status, json, raw);
    if (!json) throw new ImageProviderError("OpenAI devolvió una respuesta no JSON", "unknown", true);
    return json;
  } catch (e) {
    if (e instanceof ImageProviderError) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    if (/abort/i.test(msg)) throw new ImageProviderError(`OpenAI timeout tras ${timeoutMs / 1000}s`, "timeout", true);
    throw new ImageProviderError(msg, "unknown", true);
  } finally {
    clearTimeout(timer);
  }
}

export const openaiImageProvider: ImageProvider = {
  id: "openai",
  model: OPENAI_IMAGE_MODEL,
  isConfigured: hasOpenAIImage,
  async generate(input: ImageGenerateInput): Promise<ImageGenerateOutput> {
    if (!hasOpenAIImage()) throw new ImageProviderError("Falta OPENAI_API_KEY", "auth");
    const model = input.model || OPENAI_IMAGE_MODEL;
    const size = openAiSizeFor(input.aspect, model);
    const quality = input.quality ?? "high";
    // OpenAI puede tardar hasta 2 minutos (guía oficial).
    const timeoutMs = input.timeoutMs ?? 120_000;
    const refs = input.references ?? [];

    let json: OpenAIImageResponse;
    if (refs.length) {
      const form = new FormData();
      form.append("model", model);
      form.append("prompt", input.prompt);
      form.append("size", size);
      form.append("quality", quality);
      form.append("n", "1");
      form.append("output_format", "jpeg");
      refs.forEach((ref, i) => {
        const ext = ref.mimeType.includes("png") ? "png" : ref.mimeType.includes("webp") ? "webp" : "jpg";
        form.append("image[]", new Blob([new Uint8Array(ref.data)], { type: ref.mimeType }), `ref-${i + 1}.${ext}`);
      });
      json = await call("/images/edits", form, {}, timeoutMs);
    } else {
      json = await call(
        "/images/generations",
        JSON.stringify({ model, prompt: input.prompt, size, quality, n: 1, output_format: "jpeg", moderation: "low" }),
        { "Content-Type": "application/json" },
        timeoutMs
      );
    }

    const item = json.data?.[0];
    if (item?.b64_json) {
      return {
        bytes: Buffer.from(item.b64_json, "base64"),
        mimeType: "image/jpeg",
        model,
        usage: { inputTokens: json.usage?.input_tokens ?? 0, outputTokens: json.usage?.output_tokens ?? 0 },
      };
    }
    if (item?.url) {
      const r = await fetch(item.url);
      if (!r.ok) throw new ImageProviderError("No se pudo descargar la imagen de OpenAI", "unknown", true);
      const ct = r.headers.get("content-type") || "image/png";
      return { bytes: Buffer.from(await r.arrayBuffer()), mimeType: ct, model };
    }
    throw new ImageProviderError("OpenAI devolvió una respuesta de imagen vacía", "no_image", true);
  },
};
