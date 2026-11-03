import { anthropicTextProvider, hasAnthropicText } from "./anthropic-text";
import { geminiImageProvider, hasGeminiImage, GEMINI_IMAGE_MODEL } from "./gemini-image";
import { openaiImageProvider, hasOpenAIImage, OPENAI_IMAGE_MODEL } from "./openai-image";
import { openaiTextProvider, hasOpenAIText } from "./openai-text";
import type { AiRuntimeStatus, ImageProvider, TextProvider } from "./types";

export type { AiRuntimeStatus, ImageProvider, TextProvider };

export function getTextProvider(): TextProvider | null {
  const pref = (process.env.AI_TEXT_PROVIDER || "").toLowerCase();
  if (pref === "anthropic" && hasAnthropicText()) return anthropicTextProvider;
  if (pref === "openai" && hasOpenAIText()) return openaiTextProvider;
  if (hasAnthropicText() && !hasOpenAIText()) return anthropicTextProvider;
  if (hasOpenAIText()) return openaiTextProvider;
  return null;
}

export function getImageProvider(): ImageProvider | null {
  const pref = (process.env.AI_IMAGE_PROVIDER || "").toLowerCase();
  if (pref === "gemini" && hasGeminiImage()) return geminiImageProvider;
  if (pref === "openai" && hasOpenAIImage()) return openaiImageProvider;
  if (hasGeminiImage() && !hasOpenAIImage()) return geminiImageProvider;
  if (hasOpenAIImage()) return openaiImageProvider;
  return null;
}

export function getAiRuntimeStatus(): AiRuntimeStatus {
  const text = getTextProvider();
  const image = getImageProvider();
  return {
    textProvider: text?.id ?? "none",
    textModel: text?.model ?? "",
    imageProvider: image?.id ?? "none",
    imageModel: image?.model ?? (hasGeminiImage() ? GEMINI_IMAGE_MODEL : OPENAI_IMAGE_MODEL),
    hasTextAI: !!text,
    hasImageAI: !!image,
  };
}

// Compat con imports legacy
export { hasOpenAIText as hasOpenAI, OPENAI_IMAGE_MODEL as IMAGE_MODEL };
export { openaiTextProvider, OPENAI_TEXT_MODEL as TEXT_MODEL } from "./openai-text";
