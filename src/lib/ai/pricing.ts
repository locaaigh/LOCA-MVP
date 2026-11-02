// ─────────────────────────────────────────────────────────────
// Estimación de costo de IA — SOLO para el overlay de testing y el log
// interno de uso (ai_usage_log). Tarifas estáticas aproximadas en USD, no
// billing-grade. Fuente: tarifas oficiales leídas el 2026-10-08 (informe de
// modelos de imagen) y 2026-10-25 (Anthropic). Actualizar acá si cambian.
// ─────────────────────────────────────────────────────────────
import type { TokenUsage } from "./providers/types";

// USD por 1M tokens: [input, output]. Lectura de caché ≈ 0,1x del input.
const TEXT_PRICE_PER_MTOK: Record<string, [number, number]> = {
  "claude-opus-5-5": [4, 20],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
  "claude-opus-5": [5, 25],
  "claude-sonnet-5": [2, 10],
  "claude-opus-4-6": [5, 25],
  "claude-sonnet-4-6": [3, 15],
  "claude-haiku-4-5": [1, 5],
  "gpt-4o-mini": [0.15, 0.6],
};

interface ImagePrice {
  /** USD por imagen según tier (Gemini) o quality (OpenAI). `default` si no aplica. */
  byTier?: Partial<Record<"1K" | "2K" | "4K", number>>;
  byQuality?: Partial<Record<"low" | "medium" | "high" | "xhigh", number>>;
  default: number;
  /** USD estimados por imagen de referencia de entrada. */
  perReference?: number;
  /** true si la cifra es estimación de terceros (sin tabla oficial). */
  estimated?: boolean;
}

const IMAGE_PRICE_USD: Record<string, ImagePrice> = {
  "gemini-nano-banana-2.1": { byTier: { "1K": 0.0336, "2K": 0.0504, "4K": 0.113 }, default: 0.0504, perReference: 0.0011 },
  "gemini-3.1-flash-image": { byTier: { "1K": 0.067, "2K": 0.101 }, default: 0.101, perReference: 0.0011 },
  "gemini-3.1-flash-lite-image": { byTier: { "1K": 0.0336 }, default: 0.0336, perReference: 0.0011 },
  "gemini-3-pro-image": { byTier: { "1K": 0.134, "2K": 0.134, "4K": 0.24 }, default: 0.134, perReference: 0.0011 },
  "gemini-2.5-flash-image": { default: 0.039 },
  // Sunburst / Flare: USD 30/M tokens de imagen de salida; sin tabla oficial por imagen (estimaciones de terceros).
  "gpt-image-2.5-sunburst": { byQuality: { low: 0.013, medium: 0.03, high: 0.053, xhigh: 0.094 }, default: 0.053, perReference: 0.01, estimated: true },
  "gpt-image-2.5-flare": { byQuality: { low: 0.013, medium: 0.03, high: 0.053, xhigh: 0.094 }, default: 0.053, perReference: 0.01, estimated: true },
  "gpt-image-2": { byQuality: { low: 0.005, medium: 0.041, high: 0.165 }, default: 0.041, perReference: 0.01 },
  "gpt-image-1": { byQuality: { medium: 0.063, high: 0.25 }, default: 0.063 },
};

// Modelos ya avisados, para no spamear el log en cada llamada.
const warnedModels = new Set<string>();

function warnOnce(model: string, table: string) {
  if (warnedModels.has(model)) return;
  warnedModels.add(model);
  console.warn(`[pricing] Modelo "${model}" sin tarifa en ${table} → costo estimado 0. Agregala en src/lib/ai/pricing.ts.`);
}

export function estimateTextCostUsd(model: string, usage: TokenUsage): number {
  const rate = TEXT_PRICE_PER_MTOK[model];
  if (!rate) {
    warnOnce(model, "TEXT_PRICE_PER_MTOK");
    return 0;
  }
  const [inRate, outRate] = rate;
  const cached = usage.cacheReadTokens ?? 0;
  return (usage.inputTokens * inRate + cached * inRate * 0.1 + usage.outputTokens * outRate) / 1_000_000;
}

export function estimateImageCostUsd(
  model: string,
  opts?: { sizeTier?: "1K" | "2K" | "4K"; quality?: "low" | "medium" | "high" | "xhigh"; referenceCount?: number }
): number {
  const p = IMAGE_PRICE_USD[model];
  if (!p) {
    warnOnce(model, "IMAGE_PRICE_USD");
    return 0;
  }
  let base = p.default;
  if (opts?.sizeTier && p.byTier?.[opts.sizeTier] !== undefined) base = p.byTier[opts.sizeTier] as number;
  if (opts?.quality && p.byQuality?.[opts.quality] !== undefined) base = p.byQuality[opts.quality] as number;
  const refs = (opts?.referenceCount ?? 0) * (p.perReference ?? 0);
  return base + refs;
}

export function isImagePriceEstimated(model: string): boolean {
  return !!IMAGE_PRICE_USD[model]?.estimated;
}
