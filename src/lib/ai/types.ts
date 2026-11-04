// ─────────────────────────────────────────────────────────────
// Tipos propios de la capa de IA (NUEVO-v2). Viven acá para que
// `src/lib/types.ts` solo necesite campos opcionales que los referencian.
// Nada de esto cambia la forma de datos ya persistidos: todo es opcional.
// ─────────────────────────────────────────────────────────────
import type { AiProvider, ImageFormat } from "@/lib/types";

/** Propósito de una pieza del calendario. Es la llave que une lo que eligió
 *  el usuario (familia de imagen, sistema tipográfico) con lo que se genera. */
export type PiecePurpose =
  | "venta"
  | "producto"
  | "educativo"
  | "promo"
  | "testimonio"
  | "marca"
  | "fecha_especial"
  | "detras_de_escena"
  | "equipo";

export const PIECE_PURPOSES: PiecePurpose[] = [
  "venta",
  "producto",
  "educativo",
  "promo",
  "testimonio",
  "marca",
  "fecha_especial",
  "detras_de_escena",
  "equipo",
];

/** Las 8 familias del catálogo (7 de imagen + el sistema tipográfico). */
export type ImageFamilyId =
  | "fotografia"
  | "cinematografico"
  | "render_3d"
  | "vectorial"
  | "artistica"
  | "cartoon"
  | "lofi"
  | "tipografico";

/** Los 3 tratamientos del sistema tipográfico (piezas con texto por overlay). */
export type TypographicSystemId = "minimal_serif" | "bold_oversized" | "promo";

/** Configuración de estilo guardada en el brand kit (`brandKit.style`). */
export interface BrandStyleConfig {
  /** Familia de imagen principal. */
  primaryFamily?: ImageFamilyId;
  /** Variante elegida dentro de la familia principal (id del catálogo). */
  primaryVariant?: string;
  /** Familia secundaria opcional, solo entre pares compatibles. */
  secondaryFamily?: ImageFamilyId;
  /** Propósitos que usan la familia secundaria. Default: ["educativo"]. */
  secondaryPurposes?: PiecePurpose[];
  /** Tratamiento tipográfico para piezas con texto. */
  typographicSystem?: TypographicSystemId;
  /** Contexto argentino / latinoamericano explícito en el prompt. Default: true. */
  localFlavor?: boolean;
  /** Cómo se definió: lo eligió el usuario, default por industria o mapeo de visualStyles viejos. */
  source?: "user" | "industry_default" | "legacy_visual_styles";
}

/** Consentimiento del usuario sobre el uso de su imagen (foto del profesional). */
export interface ImageConsent {
  accepted: boolean;
  at: string; // ISO
  textVersion: string;
}

/** Caso de uso que decide el modelo de imagen (matriz del informe de oct-2026). */
export type ImageUseCase =
  | "product_reference"
  | "professional_reference"
  | "generic_people"
  | "photo_style"
  | "render_3d"
  | "vector_flat"
  | "artistic"
  | "cartoon_mascot"
  | "lofi"
  | "typographic_text";

/** Texto que la app compone por código sobre la imagen (nunca lo escribe el modelo de imagen). */
export interface OverlaySpec {
  treatment: TypographicSystemId;
  headline: string;
  subheadline?: string;
  price?: string;
  cta?: string;
  /** Zona calma donde va el texto. */
  zone: "top" | "bottom" | "center" | "left";
}

export interface QaVerdict {
  passed: boolean;
  checks: Record<string, boolean>;
  issues: string[];
  /** Solo para profesional con foto propia. */
  samePerson?: "yes" | "no" | "unsure";
  model?: string;
}

export type GenerationAttemptOutcome =
  | "ok"
  | "provider_error"
  | "qa_failed"
  | "dimension_mismatch"
  | "moderation_blocked"
  | "timeout"
  | "mock";

export interface GenerationAttempt {
  model: string;
  provider: AiProvider;
  outcome: GenerationAttemptOutcome;
  detail?: string;
  ms?: number;
}

/** Metadatos de generación guardados en la pieza (prompt final + modelo que la produjo). */
export interface GenerationMeta {
  useCase: ImageUseCase;
  family: ImageFamilyId;
  variant?: string;
  treatment?: TypographicSystemId;
  purpose?: PiecePurpose;
  /** Concepto que escribió Eva (capa 1). */
  concept: string;
  /** Prompt final que recibió el modelo (7 capas). */
  prompt: string;
  model: string;
  provider: AiProvider;
  attempts: GenerationAttempt[];
  costUsd: number;
  qa?: QaVerdict;
  overlayApplied: boolean;
  references: { product: number; person: number };
  aspect: ImageFormat;
  width?: number;
  height?: number;
  isMock: boolean;
  createdAt: string;
  /** NUEVO-v2 fix: avisos de la generación (ej. "no se compuso el texto", "sin resize").
   *  Se persisten para que la UI pueda mostrarlos; antes se perdían. */
  warnings?: string[];
  /** Eventos de producto para que la ruta los registre (format_blocked, story_interactive_blocked, qa_failed…). */
  events: GenerationEvent[];
}

export interface GenerationEvent {
  name:
    | "image_qa_failed"
    | "image_fallback_used"
    | "image_dimension_mismatch"
    | "image_moderation_blocked"
    | "image_no_face_rule_applied"
    | "image_consent_missing"
    | "format_blocked"
    | "story_interactive_blocked"
    | "agent_output_repaired"
    | "agent_mock_fallback";
  props?: Record<string, unknown>;
}

/** Versión anterior de una pieza (V1 / V2) al aplicar feedback o regenerar. */
export interface ContentVersion {
  id: string;
  createdAt: string;
  reason: "feedback" | "regenerate_image" | "manual";
  snapshot: {
    title: string;
    hook: string;
    caption: string;
    body: string;
    cta: string;
    visualConcept: string;
    imagePrompt: string;
    imageUrl?: string;
    overlay?: OverlaySpec;
    generation?: GenerationMeta;
    designTextOverlay: string;
  };
}

export type CarouselSlideRole = "portada" | "punto" | "cierre";

/** Brief por pieza que devuelve el calendario (mes coherente, A3-D2 opción c). */
export interface PieceBrief {
  purpose: PiecePurpose;
  angle: string;
  hookIdea: string;
  visualConcept: string;
  needsTextOverlay: boolean;
}
