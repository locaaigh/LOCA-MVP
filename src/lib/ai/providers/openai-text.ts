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
  async chatJson(system, user) {
    const res = await getClient().chat.completions.create({
      model: OPENAI_TEXT_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.8,
      response_format: { type: "json_object" },
    });
    const txt = res.choices[0]?.message?.content || "{}";
    return JSON.parse(txt);
  },
};
