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

export const openaiTextProvider: TextProvider = {
  id: "openai",
  model: OPENAI_TEXT_MODEL,
  isConfigured: hasOpenAIText,
  async chatJson(system, user, opts) {
    // OpenAI cachea automáticamente el prefijo largo del prompt; con anteponer
    // el bloque estable alcanza (no hay API de breakpoint como en Anthropic).
    const userContent = opts?.cachePrefix ? `${opts.cachePrefix}\n${user}` : user;
    const res = await getClient().chat.completions.create({
      model: opts?.model || OPENAI_TEXT_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
      temperature: opts?.temperature ?? 0.8,
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
