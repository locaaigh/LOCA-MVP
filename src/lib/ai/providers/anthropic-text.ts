import Anthropic from "@anthropic-ai/sdk";
import { parseJsonLoose } from "../shared/normalize";
import type { TextProvider } from "./types";

// Default del provider cuando un agente no define modelo (models.ts siempre lo define).
// ADAPTACIÓN LOCA: nuestro modelo productivo es claude-sonnet-4-6 (no 5.5).
export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

/** Los modelos 5.5+ usan `output_config.effort` y rechazan `temperature`.
 *  El resto (nuestro claude-sonnet-4-6) usa `temperature`. */
function usesEffort(model: string): boolean {
  return /-5-5|opus-5|sonnet-5|haiku-5/.test(model);
}

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export function hasAnthropicText(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

const JSON_INSTRUCTION =
  "\n\nRespondé ÚNICAMENTE con un objeto JSON válido. Sin markdown, sin texto antes ni después.";

export const anthropicTextProvider: TextProvider = {
  id: "anthropic",
  model: ANTHROPIC_MODEL,
  isConfigured: hasAnthropicText,
  async chatJson(system, user, opts) {
    // Orden del contenido: imágenes (visión) → bloque estable cacheado → pedido puntual.
    const content: Anthropic.ContentBlockParam[] = [];
    for (const img of opts?.images ?? []) {
      content.push({
        type: "image",
        source: { type: "base64", media_type: img.mediaType, data: img.data },
      });
    }
    if (opts?.cachePrefix) {
      // Bloque estable con cache_control → Anthropic lo cachea entre llamadas
      // (las 12 piezas del mes comparten el contexto del negocio).
      content.push({ type: "text", text: opts.cachePrefix, cache_control: { type: "ephemeral" } });
    }
    content.push({ type: "text", text: user });

    const model = opts?.model || ANTHROPIC_MODEL;
    // 5.5+ → effort (rechaza temperature). 4.6 (nuestro) → temperature.
    const samplingParam = usesEffort(model)
      ? opts?.effort
        ? { output_config: { effort: opts.effort } }
        : {}
      : opts?.temperature != null
        ? { temperature: opts.temperature }
        : {};
    const res = await getClient().messages.create({
      model,
      max_tokens: opts?.maxTokens ?? 8192,
      ...samplingParam,
      system: system + JSON_INSTRUCTION,
      messages: [{ role: "user", content }],
    });
    if (res.stop_reason === "refusal") {
      throw new Error("El modelo rechazó la solicitud (refusal).");
    }
    opts?.onUsage?.({
      inputTokens: res.usage.input_tokens,
      outputTokens: res.usage.output_tokens,
      cacheReadTokens: res.usage.cache_read_input_tokens ?? 0,
    });
    const txt = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    return parseJsonLoose(txt || "{}");
  },
};
