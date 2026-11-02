// ─────────────────────────────────────────────────────────────
// Ruteo de modelo de imagen por caso de uso (matriz del informe
// "Modelos de imagen por caso de uso", 2026-10-08). Primario + suplente
// por caso, override por env y flag global para volver atrás.
//
//   AI_IMAGE_ROUTING = matrix (default) | gemini-only | openai-only | legacy
//   AI_IMAGE_MODEL_<CASO>_PRIMARY / _FALLBACK = "gemini:gemini-nano-banana-2.1"
//   (CASO en mayúsculas: PRODUCT_REFERENCE, PROFESSIONAL_REFERENCE, GENERIC_PEOPLE,
//    PHOTO_STYLE, RENDER_3D, VECTOR_FLAT, ARTISTIC, CARTOON_MASCOT, LOFI, TYPOGRAPHIC_TEXT)
// ─────────────────────────────────────────────────────────────
import type { ImageUseCase } from "../types";
import type { ImageProviderId } from "../providers/types";

export type ImageQuality = "low" | "medium" | "high" | "xhigh";
export type ImageSizeTier = "1K" | "2K";

export interface ImageModelRef {
  provider: ImageProviderId;
  model: string;
  /** OpenAI: quality. Gemini: ignorado. */
  quality?: ImageQuality;
  /** Gemini: tier del lado mayor. 2K para llegar a 1080 px nativos. OpenAI: ignorado. */
  sizeTier?: ImageSizeTier;
}

export interface ImageRoute {
  primary: ImageModelRef;
  fallback: ImageModelRef;
}

export const MODEL_IDS = {
  sunburst: "gpt-image-2.5-sunburst",
  flare: "gpt-image-2.5-flare",
  nanoBanana21: "gemini-nano-banana-2.1",
  nanoBanana2: "gemini-3.1-flash-image",
  nanoBananaPro: "gemini-3-pro-image",
} as const;

const SUNBURST: ImageModelRef = { provider: "openai", model: MODEL_IDS.sunburst, quality: "high" };
const FLARE: ImageModelRef = { provider: "openai", model: MODEL_IDS.flare, quality: "high" };
const NB21_2K: ImageModelRef = { provider: "gemini", model: MODEL_IDS.nanoBanana21, sizeTier: "2K" };
const NB2_2K: ImageModelRef = { provider: "gemini", model: MODEL_IDS.nanoBanana2, sizeTier: "2K" };
// ADAPTACIÓN LOCA: nuestro modelo de imagen productivo (Nano Banana Pro).
const LOCA_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || MODEL_IDS.nanoBananaPro;
const LOCA_GEMINI: ImageModelRef = { provider: "gemini", model: LOCA_IMAGE_MODEL, sizeTier: "2K" };

/** Tabla A del informe (post de feed; el modelo rara vez cambia con el formato). */
export const DEFAULT_ROUTES: Record<ImageUseCase, ImageRoute> = {
  product_reference: { primary: SUNBURST, fallback: NB21_2K },
  professional_reference: { primary: NB21_2K, fallback: SUNBURST },
  generic_people: { primary: FLARE, fallback: NB21_2K },
  photo_style: { primary: FLARE, fallback: NB21_2K },
  render_3d: { primary: FLARE, fallback: NB21_2K },
  vector_flat: { primary: FLARE, fallback: NB21_2K }, // Recraft V4.1 cuando se integre
  artistic: { primary: FLARE, fallback: NB21_2K },
  cartoon_mascot: { primary: NB21_2K, fallback: FLARE },
  lofi: { primary: FLARE, fallback: NB21_2K },
  // Fondo sin texto + overlay por código. El fondo no necesita el modelo más caro.
  typographic_text: { primary: NB21_2K, fallback: FLARE },
};

export type RoutingMode = "matrix" | "gemini-only" | "openai-only" | "legacy";

export function routingMode(): RoutingMode {
  // ADAPTACIÓN LOCA: default gemini-only (no usamos OpenAI). Override por env si hiciera falta.
  const v = (process.env.AI_IMAGE_ROUTING || "gemini-only").toLowerCase().trim();
  if (v === "gemini-only" || v === "openai-only" || v === "legacy" || v === "matrix") return v;
  return "gemini-only";
}

function parseRef(raw: string | undefined, base: ImageModelRef): ImageModelRef | null {
  if (!raw) return null;
  const [provider, model] = raw.split(":").map((s) => s.trim());
  if ((provider === "gemini" || provider === "openai") && model) {
    return { ...base, provider, model };
  }
  return null;
}

/** Modelo "legacy": un solo modelo para todo según AI_IMAGE_PROVIDER + *_IMAGE_MODEL. */
export function legacyRef(): ImageModelRef {
  const pref = (process.env.AI_IMAGE_PROVIDER || "gemini").toLowerCase();
  if (pref === "openai") {
    return { provider: "openai", model: process.env.OPENAI_IMAGE_MODEL || MODEL_IDS.flare, quality: "high" };
  }
  return { provider: "gemini", model: process.env.GEMINI_IMAGE_MODEL || MODEL_IDS.nanoBanana21, sizeTier: "2K" };
}

export function routeFor(
  useCase: ImageUseCase,
  available: { openai: boolean; gemini: boolean }
): ImageRoute {
  const mode = routingMode();
  if (mode === "legacy") {
    const ref = legacyRef();
    return { primary: ref, fallback: ref.provider === "gemini" ? NB2_2K : NB21_2K };
  }
  if (mode === "gemini-only") return { primary: LOCA_GEMINI, fallback: LOCA_GEMINI };
  if (mode === "openai-only") {
    const r = DEFAULT_ROUTES[useCase];
    const p = r.primary.provider === "openai" ? r.primary : r.fallback;
    return { primary: p, fallback: p.model === MODEL_IDS.sunburst ? FLARE : SUNBURST };
  }

  const key = useCase.toUpperCase();
  const base = DEFAULT_ROUTES[useCase];
  let primary = parseRef(process.env[`AI_IMAGE_MODEL_${key}_PRIMARY`], base.primary) ?? base.primary;
  let fallback = parseRef(process.env[`AI_IMAGE_MODEL_${key}_FALLBACK`], base.fallback) ?? base.fallback;

  // Disponibilidad: si falta la key de un proveedor, se usa el otro (nunca se queda sin ruta).
  const ok = (r: ImageModelRef) => (r.provider === "openai" ? available.openai : available.gemini);
  if (!ok(primary) && ok(fallback)) [primary, fallback] = [fallback, primary];
  if (!ok(fallback)) fallback = primary.provider === "gemini" ? NB2_2K : FLARE;
  if (!ok(fallback)) fallback = primary;
  return { primary, fallback };
}
