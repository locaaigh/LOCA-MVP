// ─────────────────────────────────────────────────────────────
// FUENTE ÚNICA de reglas de formato (B2). Dado canal + tipo de contenido
// devuelve proporción, dimensiones finales, si es publicable hoy, zona
// segura para overlay y la composición que se le pide al modelo.
// Nada decide proporción fuera de este módulo.
// ─────────────────────────────────────────────────────────────
import type { Channel, ContentFormat, ImageFormat } from "@/lib/types";
import { isFormatEnabled } from "@/lib/constants";

export interface FormatRules {
  aspect: ImageFormat;
  /** Dimensiones finales de entrega (lo que se sube a Storage y se publica). */
  width: number;
  height: number;
  /** Publicable por API hoy (generación + publicación end-to-end). */
  publishable: boolean;
  /** Por qué no es publicable (para la UI y para el log). */
  reason?: string;
  /** Carrusel: cantidad de slides permitida. */
  slides?: { min: number; max: number };
  /** Fracción superior/inferior reservada a la UI de la red (story: 15%). */
  safeArea: { top: number; bottom: number };
  /** Composición que se le pide al modelo para este aspecto (capa 6 del prompt). */
  composition: string;
  notes: string[];
}

/** Dimensiones finales por proporción. */
export const FINAL_DIMENSIONS: Record<ImageFormat, { w: number; h: number }> = {
  "1:1": { w: 1080, h: 1080 },
  "4:5": { w: 1080, h: 1350 },
  "9:16": { w: 1080, h: 1920 },
  "1.91:1": { w: 1200, h: 628 },
};

export function aspectRatioOf(aspect: ImageFormat): number {
  const d = FINAL_DIMENSIONS[aspect];
  return d.w / d.h;
}

const COMPOSITION: Record<ImageFormat, string> = {
  "4:5":
    "Vertical 4:5 portrait framing. Main subject centered or in the lower two thirds, calm negative space above, natural vertical composition.",
  "9:16":
    "Tall vertical 9:16 framing for a story. Main subject in the central third, background extends naturally above and below, nothing critical near the top or bottom edges.",
  "1.91:1":
    "Wide horizontal 1.91:1 framing. Main subject offset to one side with negative space on the other, low horizon.",
  "1:1": "Square 1:1 framing. Main subject centered with even margins.",
};

const FEED_CHANNELS: Channel[] = ["Instagram", "Facebook"];

/**
 * Proporción de la imagen según canal, tipo de contenido y redes adicionales.
 * Regla de producto (feedback 2026-10-08, B2):
 *  - Feed (post / ad) para cualquier red o crosspost: 4:5.
 *  - Post que va SOLO a LinkedIn: 1.91:1. Si también va a IG o FB, 4:5.
 *  - Story (IG y FB): 9:16. Reel: 9:16 (deshabilitado).
 *  - Carrusel: 4:5 en todas las slides.
 */
export function imageFormatFor(
  channel: Channel,
  format: ContentFormat,
  opts?: { distribution?: Channel[] }
): ImageFormat {
  if (format === "story" || format === "reel") return "9:16";
  if (format === "carrusel") return "4:5";
  const goesToFeedNetworks =
    FEED_CHANNELS.includes(channel) ||
    (opts?.distribution ?? []).some((c) => FEED_CHANNELS.includes(c));
  if (channel === "LinkedIn" && !goesToFeedNetworks) {
    const pref = (process.env.AI_LINKEDIN_FEED_ASPECT || "1.91:1").trim();
    return pref === "4:5" ? "4:5" : "1.91:1";
  }
  return "4:5";
}

/** Qué pares canal + formato se publican por API hoy. Lo demás se genera (si el flag lo permite) pero no se publica solo. */
function publishability(channel: Channel, format: ContentFormat): { ok: boolean; reason?: string } {
  if (!isFormatEnabled(format)) return { ok: false, reason: `El formato ${format} está deshabilitado (flag DISABLED_CONTENT_FORMATS).` };
  if (channel === "TikTok") return { ok: false, reason: "TikTok no tiene publicación automática en LOCA." };
  if (channel === "LinkedIn") return { ok: false, reason: "La publicación en LinkedIn todavía no está implementada." };
  if (format === "post_estatico") return { ok: true };
  if (format === "story") return { ok: false, reason: "La publicación de stories (B5) todavía no está implementada: se sube a mano desde el celular." };
  if (format === "carrusel") return { ok: false, reason: "La publicación de carruseles (B3) todavía no está implementada." };
  if (format === "reel") return { ok: false, reason: "Los reels están fuera de alcance (B4)." };
  return { ok: false, reason: `El formato ${format} no se publica en redes.` };
}

export function isPublishable(channel: Channel, format: ContentFormat): boolean {
  return publishability(channel, format).ok;
}

export function formatRules(
  channel: Channel,
  format: ContentFormat,
  opts?: { distribution?: Channel[] }
): FormatRules {
  const aspect = imageFormatFor(channel, format, opts);
  const { w, h } = FINAL_DIMENSIONS[aspect];
  const pub = publishability(channel, format);
  const notes: string[] = [];
  if (format === "story") notes.push("Story: nada crítico en el 15% superior ni inferior (UI de Instagram).");
  if (format === "story") notes.push("Story: sin elementos interactivos (encuestas, stickers, links). Solo imagen; el texto va por overlay.");
  if (format === "carrusel") notes.push("Carrusel: misma proporción, misma variante y mismas referencias en todas las slides.");
  if (aspect === "1.91:1") notes.push("Solo LinkedIn: si se agrega otra red, pasa a 4:5.");
  return {
    aspect,
    width: w,
    height: h,
    publishable: pub.ok,
    reason: pub.reason,
    slides: format === "carrusel" ? { min: 2, max: 8 } : undefined,
    safeArea: format === "story" ? { top: 0.15, bottom: 0.15 } : { top: 0, bottom: 0 },
    composition: COMPOSITION[aspect],
    notes,
  };
}

/** Proporción real de un archivo → ImageFormat más cercano (tolerancia 2%), o null si no coincide con ninguno. */
export function aspectFromDimensions(width: number, height: number, tolerance = 0.02): ImageFormat | null {
  if (!width || !height) return null;
  const ratio = width / height;
  const candidates = Object.keys(FINAL_DIMENSIONS) as ImageFormat[];
  let best: ImageFormat | null = null;
  let bestDiff = Infinity;
  for (const a of candidates) {
    const diff = Math.abs(ratio - aspectRatioOf(a)) / aspectRatioOf(a);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = a;
    }
  }
  return bestDiff <= tolerance ? best : null;
}

export function imageMatchesAspect(width: number, height: number, aspect: ImageFormat, tolerance = 0.02): boolean {
  if (!width || !height) return false;
  const diff = Math.abs(width / height - aspectRatioOf(aspect)) / aspectRatioOf(aspect);
  return diff <= tolerance;
}

/**
 * Chequeo antes de publicar (para la ruta de publicación, B2 punto 4):
 * lanza un error claro y accionable si el par canal+formato no es publicable
 * o si la proporción de la imagen no corresponde al destino.
 */
export function assertImageMatchesFormat(params: {
  channel: Channel;
  format: ContentFormat;
  width?: number;
  height?: number;
  distribution?: Channel[];
}): void {
  const rules = formatRules(params.channel, params.format, { distribution: params.distribution });
  if (!rules.publishable) throw new Error(rules.reason || "Este formato no se puede publicar automáticamente.");
  if (params.width && params.height && !imageMatchesAspect(params.width, params.height, rules.aspect)) {
    const actual = aspectFromDimensions(params.width, params.height) ?? `${params.width}x${params.height}`;
    throw new Error(
      `Esta imagen es ${actual} y ${params.channel} (${params.format}) necesita ${rules.aspect}. Regenerá la imagen antes de publicar.`
    );
  }
}
