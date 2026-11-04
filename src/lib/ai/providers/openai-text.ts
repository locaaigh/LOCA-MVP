import OpenAI from "openai";
import type { TextProvider } from "./types";

export const OPENAI_TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

export function hasOpenAIText(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/** Si el modelo pedido es de Anthropic (claude-*), acá se usa el default de OpenAI. */
function resolveModel(model?: string): string {
  if (!model || model.startsWith("claude-")) return OPENAI_TEXT_MODEL;
  return model;
}

export const openaiTextProvider: TextProvider = {
  id: "openai",
  model: OPENAI_TEXT_MODEL,
  isConfigured: hasOpenAIText,
  async chatJson(system, user, opts) {
    // OpenAI cachea automáticamente el prefijo largo del prompt; con anteponer
    // el bloque estable alcanza (no hay API de breakpoint como en Anthropic).
    const text = opts?.cachePrefix ? `${opts.cachePrefix}\n${user}` : user;
    const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [
      ...(opts?.images ?? []).map((img) => ({
        type: "image_url" as const,
        image_url: { url: `data:${img.mediaType};base64,${img.data}` },
      })),
      { type: "text" as const, text },
    ];
    const res = await getClient().chat.completions.create({
      model: resolveModel(opts?.model),
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
      max_tokens: opts?.maxTokens,
      response_format: { type: "json_object" },
    });
    opts?.onUsage?.({
      inputTokens: res.usage?.prompt_tokens ?? 0,
      outputTokens: res.usage?.completion_tokens ?? 0,
    });
    const txt = res.choices[0]?.message?.content || "{}";
    return JSON.parse(txt);
  },
};
