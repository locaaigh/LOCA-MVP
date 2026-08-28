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

// Modelos ya avisados, para no spamear el log en cada llamada.
const warnedModels = new Set<string>();

export function estimateTextCostUsd(model: string, usage: TokenUsage): number {
  const rate = TEXT_PRICE_PER_MTOK[model];
  if (!rate) {
    // Un modelo sin tarifa registra costo 0 y arruina la medición sin avisar
    // (B1 F1.1). Avisamos una vez para que se agregue la tarifa acá.
    if (!warnedModels.has(model)) {
      warnedModels.add(model);
      console.warn(
        `[pricing] Modelo "${model}" sin tarifa en TEXT_PRICE_PER_MTOK → costo estimado 0. Agregala en src/lib/ai/pricing.ts.`
      );
    }
    return 0;
  }
  const [inRate, outRate] = rate;
  return (usage.inputTokens * inRate + usage.outputTokens * outRate) / 1_000_000;
}

export function estimateImageCostUsd(model: string): number {
  return IMAGE_PRICE_USD[model] ?? 0;
}
