import OpenAI from "openai";

export function hasOpenAI(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

let client: OpenAI | null = null;
export function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini";
export const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";

// Pide JSON al modelo y lo parsea. Lanza si falla (el caller hace fallback a mock).
export async function chatJson(
  system: string,
  user: string
): Promise<unknown> {
  const res = await getClient().chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.8,
    response_format: { type: "json_object" },
  });
  const txt = res.choices[0]?.message?.content || "{}";
  return JSON.parse(txt);
}
