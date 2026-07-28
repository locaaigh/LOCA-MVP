// ─────────────────────────────────────────────────────────────
// Estimación de costo de IA — SOLO para el overlay de testing y el log
// interno de uso. Tarifas estáticas aproximadas (USD), no billing-grade:
// actualizar acá si cambian los precios de los proveedores.
// ─────────────────────────────────────────────────────────────
import type { TokenUsage } from "./providers/types";

// USD por 1M tokens: [input, output]
const TEXT_PRICE_PER_MTOK: Record<string, [number, number]> = {
  "claude-sonnet-4-6": [3, 15],
  "gpt-4o-mini": [0.15, 0.6],
};

// USD por imagen generada (no hay tokens reales confiables de ningún proveedor acá)
const IMAGE_PRICE_USD: Record<string, number> = {
  "gemini-3-pro-image": 0.03,
  "gpt-image-1": 0.05,
};

export function estimateTextCostUsd(model: string, usage: TokenUsage): number {
  const [inRate, outRate] = TEXT_PRICE_PER_MTOK[model] || [0, 0];
  return (usage.inputTokens * inRate + usage.outputTokens * outRate) / 1_000_000;
}

export function estimateImageCostUsd(model: string): number {
  return IMAGE_PRICE_USD[model] ?? 0;
}
