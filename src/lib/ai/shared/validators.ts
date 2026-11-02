// ─────────────────────────────────────────────────────────────
// Validación en código (no solo en el prompt) de las reglas de formato:
//  - Stories: nada interactivo (B5). Se limpian frases con términos prohibidos.
//  - Reels: deshabilitados (B4). Si el modelo igual los devuelve → post_estatico.
//  - Formatos apagados por flag → post_estatico.
// Cada corrección devuelve `hits` para registrar el evento y medir frecuencia.
// ─────────────────────────────────────────────────────────────
import type { ContentFormat } from "@/lib/types";
import { isFormatEnabled } from "@/lib/constants";

export const STORY_FORBIDDEN: Array<{ label: string; re: RegExp }> = [
  { label: "encuesta", re: /\bencuestas?\b/i },
  { label: "poll", re: /\bpolls?\b/i },
  { label: "quiz", re: /\bquiz(?:zes)?\b|\btrivia\b/i },
  { label: "sticker", re: /\bstickers?\b/i },
  { label: "swipe up", re: /\bswipe[- ]?up\b/i },
  { label: "deslizá hacia arriba", re: /desliz[aá]\s+(hacia\s+)?arriba|desliz[aá]\s+para\s+arriba/i },
  { label: "link en la story", re: /\blink\s+(en|de)\s+la\s+(story|historia)\b|\bsticker\s+de\s+link\b/i },
  { label: "cuenta regresiva", re: /cuenta\s+regresiva|\bcountdown\b/i },
  { label: "caja de preguntas", re: /caja\s+de\s+preguntas|\bpreguntas\s+y\s+respuestas\b|\bQ&A\b/i },
  { label: "slider", re: /\bslider\b|\bbarra\s+deslizante\b/i },
  { label: "música", re: /\bsticker\s+de\s+m[úu]sica\b|\bagreg[aá]\s+m[úu]sica\b/i },
  { label: "mención", re: /\bmencion[aá](?:me|nos)?\b.*\b(en\s+la\s+story|en\s+tu\s+story)\b|\bsticker\s+de\s+menci[óo]n\b/i },
  { label: "reacciona", re: /\breaccion[aá]\s+con\b|\bmand[aá]\s+una\s+reacci[óo]n\b/i },
];

export interface SanitizeResult {
  text: string;
  hits: string[];
}

/** Saca las oraciones que piden interacción nativa de story. Si queda vacío, elimina solo los términos. */
export function sanitizeStoryText(text: string): SanitizeResult {
  if (!text) return { text, hits: [] };
  const hits = new Set<string>();
  const sentences = text.split(/(?<=[.!?\n])\s+/);
  const kept = sentences.filter((s) => {
    const bad = STORY_FORBIDDEN.filter((f) => f.re.test(s));
    bad.forEach((b) => hits.add(b.label));
    return bad.length === 0;
  });
  let out = kept.join(" ").replace(/\s{2,}/g, " ").trim();
  if (!out && hits.size) {
    out = text;
    for (const f of STORY_FORBIDDEN) out = out.replace(f.re, "");
    out = out.replace(/\s{2,}/g, " ").trim();
  }
  return { text: out, hits: Array.from(hits) };
}

export function sanitizeStoryFields<T extends Record<string, unknown>>(
  obj: T,
  fields: Array<keyof T>
): { value: T; hits: string[] } {
  const hits = new Set<string>();
  const value = { ...obj };
  for (const f of fields) {
    const v = value[f];
    if (typeof v === "string") {
      const r = sanitizeStoryText(v);
      r.hits.forEach((h) => hits.add(h));
      (value as Record<string, unknown>)[f as string] = r.text;
    }
  }
  return { value, hits: Array.from(hits) };
}

/** Formato apagado (reel, carrusel por flag) → post_estatico. Devuelve si hubo corrección. */
export function gateFormat(format: ContentFormat): { format: ContentFormat; blocked?: ContentFormat } {
  if (format === "reel") return { format: "post_estatico", blocked: "reel" };
  if (!isFormatEnabled(format)) return { format: "post_estatico", blocked: format };
  return { format };
}

/** Quita "reel"/"video" del mix de contenidos de la estrategia. */
export function stripReelsFromMix<T extends { type: string; percentage: number }>(mix: T[]): { mix: T[]; removed: boolean } {
  const kept = mix.filter((m) => !/\breels?\b|\bvideos?\b|\btiktok\b/i.test(m.type));
  if (kept.length === mix.length) return { mix, removed: false };
  const total = kept.reduce((a, m) => a + (m.percentage || 0), 0) || 1;
  return { mix: kept.map((m) => ({ ...m, percentage: Math.round((m.percentage / total) * 100) })), removed: true };
}

export const INTERACTIVE_STORY_RULE =
  "Las stories se publican como imagen (o video) fija: NUNCA propongas ni menciones encuestas, quiz, stickers, sliders, cuenta regresiva, caja de preguntas, swipe up, 'deslizá hacia arriba', link en la story, música ni menciones. Si querés interacción, resolvela con el texto de la imagen y un CTA como 'respondeme por mensaje'.";

export const NO_REELS_RULE =
  "LOCA NO produce reels ni videos por ahora: no propongas reels, videos, TikToks ni guiones de video en ningún campo. Los formatos disponibles son los que se listan explícitamente.";
