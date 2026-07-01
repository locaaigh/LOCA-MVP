import type { Channel, ContentFormat } from "@/lib/types";

export const VALID_CHANNELS: Channel[] = ["Instagram", "Facebook", "TikTok", "LinkedIn"];
export const VALID_FORMATS: ContentFormat[] = [
  "post_estatico",
  "carrusel",
  "reel",
  "story",
  "ad",
  "email",
];

export function asArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x));
  if (typeof v === "string" && v.trim()) return [v];
  return [];
}

export function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim() ? v : fallback;
}

/** Parsea JSON de respuestas de IA (markdown, texto extra, etc.). */
export function parseJsonLoose(raw: string): unknown {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  if (!cleaned) return {};

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new SyntaxError("La IA no devolvió JSON válido");
  }
}

export function asChannel(v: unknown, fb: Channel): Channel {
  return VALID_CHANNELS.includes(v as Channel) ? (v as Channel) : fb;
}

export function asFormat(v: unknown, fb: ContentFormat): ContentFormat {
  return VALID_FORMATS.includes(v as ContentFormat) ? (v as ContentFormat) : fb;
}

export function normalizeVideo(v: unknown) {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const scenes = Array.isArray(o.scenes)
    ? o.scenes.map((s: unknown) => {
        const sc = s as Record<string, unknown>;
        return {
          scene: asString(sc.scene),
          onScreenText: asString(sc.onScreenText),
          voiceover: asString(sc.voiceover),
        };
      })
    : [];
  if (!scenes.length) return undefined;
  return {
    concept: asString(o.concept),
    durationSeconds: Number(o.durationSeconds) || 20,
    scenes,
    music: asString(o.music),
    cta: asString(o.cta),
  };
}

export function normalizePhoto(p: unknown) {
  if (!p || typeof p !== "object") return undefined;
  const o = p as Record<string, unknown>;
  const idea = asString(o.idea);
  if (!idea) return undefined;
  return {
    idea,
    shotList: asArray(o.shotList),
    props: asArray(o.props),
    composition: asString(o.composition),
  };
}
