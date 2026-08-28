import Anthropic from "@anthropic-ai/sdk";
import { parseJsonLoose } from "../shared/normalize";
import type { TextProvider } from "./types";

export const ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

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
    // El bloque estable (cachePrefix) va como su propio content block con
    // cache_control ephemeral → Anthropic lo cachea entre llamadas (las 12
    // piezas del mes comparten el contexto del negocio).
    const content: Anthropic.TextBlockParam[] = opts?.cachePrefix
      ? [
          { type: "text", text: opts.cachePrefix, cache_control: { type: "ephemeral" } },
          { type: "text", text: user },
        ]
      : [{ type: "text", text: user }];

    const res = await getClient().messages.create({
      model: opts?.model || ANTHROPIC_MODEL,
      max_tokens: 8192,
      ...(opts?.temperature !== undefined ? { temperature: opts.temperature } : {}),
      system: system + JSON_INSTRUCTION,
      messages: [{ role: "user", content }],
    });
    // Reportamos SOLo input_tokens (el input NO servido desde caché, facturado
    // a tarifa plena). Cuando el cachePrefix pega en caché, este número cae
    // fuerte → el ahorro de F1.2 se ve directo en ai_usage_log.inputTokens.
    // (Los cache_read se facturan a ~0.1x; omitirlos subestima levemente el
    // costo, aceptable para una estimación interna no billing-grade.)
    opts?.onUsage?.({
      inputTokens: res.usage.input_tokens,
      outputTokens: res.usage.output_tokens,
    });
    const block = res.content.find((b) => b.type === "text");
    const txt = block?.type === "text" ? block.text : "{}";
    return parseJsonLoose(txt);
  },
};
