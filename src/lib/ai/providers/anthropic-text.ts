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

export const anthropicTextProvider: TextProvider = {
  id: "anthropic",
  model: ANTHROPIC_MODEL,
  isConfigured: hasAnthropicText,
  async chatJson(system, user) {
    const res = await getClient().messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 8192,
      system:
        system +
        "\n\nRespondé ÚNICAMENTE con un objeto JSON válido. Sin markdown, sin texto antes ni después.",
      messages: [{ role: "user", content: user }],
    });
    const block = res.content.find((b) => b.type === "text");
    const txt = block?.type === "text" ? block.text : "{}";
    return parseJsonLoose(txt);
  },
};
