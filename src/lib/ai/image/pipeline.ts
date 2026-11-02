// ─────────────────────────────────────────────────────────────
// Pipeline de imagen de una pieza (NUEVO-v2):
//   formatos → estilo por propósito → referencias → caso de uso → prompt (7 capas)
//   → proveedor primario / suplente → QA → resize exacto + JPEG → overlay de texto
// Devuelve bytes + `generation` (prompt final, modelo, intentos, QA, costo).
// Nunca devuelve una imagen que falló el QA o la proporción.
// ─────────────────────────────────────────────────────────────
import type { AiMeta, AiProvider, Business, CarouselSlide, ContentItem } from "@/lib/types";
import type { GenerationAttempt, GenerationEvent, GenerationMeta, ImageUseCase, OverlaySpec, PiecePurpose, QaVerdict } from "../types";
import { getImageProviderById, imageProvidersAvailable } from "../providers";
import { ImageProviderError, type ImageReference } from "../providers/types";
import { estimateImageCostUsd } from "../pricing";
import { formatRules } from "./formats";
import { resolvePieceStyle, type ResolvedPieceStyle } from "./style-resolver";
import { PRODUCT_REFERENCE_FAMILIES, PROFESSIONAL_REFERENCE_FAMILIES, STYLE_FAMILIES } from "./style-catalog";
import { collectReferences, type CollectedReferences } from "./references";
import { buildImagePrompt, type ImagePromptSpec } from "./prompt-builder";
import { routeFor, type ImageModelRef } from "./routing";
import { runImageQa } from "./qa";
import { finalizeImage, imageMatchesAspectLoose, readImageDimensions } from "./raster-extra";
import { applyOverlay, paletteFromBusiness } from "./overlay";

export interface ImagePipelineInput {
  business: Business;
  content: ContentItem;
  /** Slide de carrusel: usa su concepto y overlay en vez de los de la pieza. */
  slide?: CarouselSlide;
  /** Índice de la pieza en el mes (rotación de variantes). */
  pieceIndex?: number;
  /** Concepto nuevo (regeneración con feedback). */
  conceptOverride?: string;
  /** Referencias ya descargadas (carrusel: mismas refs en todas las slides). */
  references?: CollectedReferences;
}

export interface ImagePipelineResult {
  status: "generada" | "error";
  bytes?: Buffer;
  mimeType?: string;
  width?: number;
  height?: number;
  generation: GenerationMeta;
  error?: string;
  warnings: string[];
  meta: AiMeta;
}

const MAX_ATTEMPTS = 4;

/** Propósito inferido para piezas viejas sin `purpose` (calendarios anteriores a NUEVO-v2). */
export function inferPurpose(
  content: Pick<ContentItem, "purpose" | "objective" | "contentPillar" | "title"> & { topic?: string },
  hasProduct: boolean
): PiecePurpose {
  if (content.purpose) return content.purpose;
  const hay = `${content.objective} ${content.contentPillar} ${content.topic ?? ""} ${content.title}`.toLowerCase();
  if (/promo|oferta|descuento|rebaja|liquidaci|lanzamiento|2x1|sale\b/.test(hay)) return "promo";
  if (/tip|consejo|c[óo]mo |gu[íi]a|aprend|educa|error(es)? comunes|sab[íi]as|mito/.test(hay)) return "educativo";
  if (/testimonio|rese[ñn]a|opini[óo]n|clientes? dicen|caso de [ée]xito/.test(hay)) return "testimonio";
  if (/d[íi]a de|d[íi]a del|navidad|a[ñn]o nuevo|hot sale|cyber|san valent|pascua|aniversario/.test(hay)) return "fecha_especial";
  if (/detr[áa]s de escena|backstage|proceso|c[óo]mo lo hacemos/.test(hay)) return "detras_de_escena";
  if (/equipo|nosotros|quienes somos|qui[ée]nes somos/.test(hay)) return "equipo";
  if (/conversi[óo]n/.test(content.objective.toLowerCase()) || hasProduct) return hasProduct ? "producto" : "venta";
  return "marca";
}

function hasPeopleInConcept(concept: string): boolean {
  return /\b(person|people|woman|women|man|men|customer|client|guest|team|barista|chef|owner|professional|hands?|couple|family|kid|child|children|smiling|nutritionist|dentist|doctor|lawyer|accountant|coach|trainer|stylist|hairdresser|photographer|designer|therapist|teacher|he|she|her|his)\b/i.test(concept);
}

function decideUseCase(style: ResolvedPieceStyle, refs: { product: number; person: number }, concept: string): ImageUseCase {
  if (refs.person > 0) return "professional_reference";
  if (refs.product > 0) return "product_reference";
  if (style.usesTypographic) return "typographic_text";
  switch (style.family) {
    case "fotografia":
      return hasPeopleInConcept(concept) ? "generic_people" : "photo_style";
    case "cinematografico":
      return hasPeopleInConcept(concept) ? "generic_people" : "photo_style";
    case "render_3d":
      return "render_3d";
    case "vectorial":
      return "vector_flat";
    case "artistica":
      return "artistic";
    case "cartoon":
      return "cartoon_mascot";
    case "lofi":
      return "lofi";
    default:
      return "typographic_text";
  }
}

/** Concepto de la pieza: override → prompt editado a mano por el usuario → visualConcept → prompt legacy → título. */
function pickConcept(content: ContentItem, slide?: CarouselSlide, override?: string): string {
  if (override?.trim()) return override.trim();
  if (slide) return slide.visualConcept?.trim() || slide.imagePrompt?.trim() || content.visualConcept;
  const userEdited = content.imagePrompt && content.generation?.prompt && content.imagePrompt.trim() !== content.generation.prompt.trim();
  if (userEdited) return content.imagePrompt.trim();
  if (content.visualConcept?.trim()) return content.visualConcept.trim();
  if (content.imagePrompt?.trim()) return content.imagePrompt.trim();
  return content.title;
}

function shortCta(cta: string): string {
  const c = (cta || "").replace(/[👉🎉💛✨]/g, "").trim();
  return c.length > 40 ? c.slice(0, 37).trim() + "…" : c;
}

function buildOverlaySpec(style: ResolvedPieceStyle, content: ContentItem, slide: CarouselSlide | undefined, isStory: boolean): OverlaySpec | undefined {
  if (!style.usesTypographic && !style.headlineOverlay) return undefined;
  const src = slide?.overlay ?? content.overlay;
  const headline = (src?.headline || content.designTextOverlay || content.hook || content.title || "").trim();
  if (!headline) return undefined;
  const zone: OverlaySpec["zone"] = isStory ? "center" : style.treatment.zone;
  if (style.headlineOverlay) {
    // Fecha especial: titular corto sobre la imagen, sin bajada ni precio.
    return { treatment: style.treatment.id, headline: headline.slice(0, 70), cta: src?.cta ? shortCta(src.cta) : undefined, zone };
  }
  return {
    treatment: style.treatment.id,
    headline: headline.slice(0, 90),
    subheadline: src?.subheadline?.trim() || undefined,
    price: src?.price?.trim() || undefined,
    cta: shortCta(src?.cta || content.cta) || undefined,
    zone,
  };
}

const RETRY_NOTES: Record<string, string> = {
  noText: "The previous image contained visible writing: every notebook, paper, label, screen, sign or package must be completely blank, with no letters, numbers, scribbles or handwriting.",
  noLogos: "The previous image showed a logo or brand mark: all objects must be plain and unbranded.",
  anatomy: "The previous image had anatomy errors: show hands only partially or hidden, simple poses, no complex finger positions.",
  noProtagonistFace: "The previous image showed a face: no faces at all, frame people from behind, from the neck down, or out of frame.",
  noStereotype: "Avoid any folkloric or ethnic cliché: contemporary, everyday, realistic people and settings.",
  productFidelity: "The previous image altered the client's product: reproduce the reference product exactly (shape, proportions, colors, label), do not reinterpret it.",
  personIdentity: "The previous image changed the person's face: reproduce the reference person's identity exactly.",
};

function retryNotesFor(qa: QaVerdict, overlayZone?: "top" | "bottom" | "center" | "left"): string[] {
  const notes = Object.entries(qa.checks)
    .filter(([, ok]) => !ok)
    .map(([k]) => RETRY_NOTES[k])
    .filter((n): n is string => !!n);
  if (!qa.checks.calmZone && overlayZone) notes.push(`Keep the ${overlayZone} area completely empty: plain surface, no objects, no detail.`);
  return notes;
}

function asProvider(id: ImageModelRef["provider"]): AiProvider {
  return id;
}

export async function generatePieceImage(input: ImagePipelineInput): Promise<ImagePipelineResult> {
  const { business, content, slide } = input;
  const startedAt = Date.now();
  const warnings: string[] = [];
  const events: GenerationEvent[] = [];
  const attempts: GenerationAttempt[] = [];
  let costUsd = 0;
  let inputTokens = 0;
  let outputTokens = 0;

  // 1. Formato
  const rules = formatRules(content.channel, content.format, { distribution: content.distributionPlatforms });
  const isStory = content.format === "story";

  // 2. Estilo por propósito
  const hasProductPhotos = business.productsServices.some((p) => (p.photos?.length ?? 0) > 0);
  const purpose = inferPurpose(content, hasProductPhotos);
  const style = resolvePieceStyle(business, purpose, input.pieceIndex ?? 0);

  // 3. Referencias (solo donde la familia las respeta)
  const productAllowed = PRODUCT_REFERENCE_FAMILIES.includes(style.family) || style.usesTypographic;
  const personAllowed = PROFESSIONAL_REFERENCE_FAMILIES.includes(style.family);
  const refs =
    input.references ??
    (await collectReferences(business, content, { includeProduct: productAllowed, includePerson: personAllowed }));
  warnings.push(...refs.warnings);
  if (refs.consentMissing) events.push({ name: "image_consent_missing" });
  if (!productAllowed && hasProductPhotos) {
    warnings.push(`En el estilo ${STYLE_FAMILIES[style.family].label} tu producto aparece interpretado, no fotográfico.`);
  }
  let productRefs: ImageReference[] = productAllowed ? refs.product : [];
  let personRefs: ImageReference[] = personAllowed ? refs.person : [];

  // Regla dura: profesional sin foto propia (o familia no fotográfica) → sin rostro protagonista.
  let noFace = refs.isProfessional && personRefs.length === 0;
  if (noFace) events.push({ name: "image_no_face_rule_applied", props: { reason: refs.consentMissing ? "consent_missing" : personAllowed ? "no_photo" : "family_not_photographic" } });

  // 4. Concepto y caso de uso
  const concept = pickConcept(content, slide, input.conceptOverride);
  let useCase = decideUseCase(style, { product: productRefs.length, person: personRefs.length }, concept);

  // 5. Overlay
  const overlay = buildOverlaySpec(style, content, slide, isStory);
  const palette = paletteFromBusiness(business);
  const bk = business.brandKit;

  const retryNotes: string[] = [];
  const buildPrompt = () =>
    buildImagePrompt({
      concept,
      retryNotes,
      references: {
        product: productRefs.length,
        person: personRefs.length,
        mascot: 0,
        productName: refs.productName,
        productNotes: refs.productNotes,
      },
      noFace,
      styleBlock: style.styleBlock,
      brand: {
        primaryHex: palette.primary,
        secondaryHex: palette.secondary !== palette.primary ? palette.secondary : undefined,
        accentHex: palette.accent !== palette.primary ? palette.accent : undefined,
        tone: bk?.voiceTone?.toneTags?.slice(0, 3).join(", ") || undefined,
      },
      localFlavor: style.localFlavor,
      country: business.country,
      aspect: rules.aspect,
      composition: rules.composition,
      isStory,
      overlay: overlay ? { zone: overlay.zone, fraction: style.calmZoneFraction || 0.33 } : undefined,
      extraRestrictions: STYLE_FAMILIES[style.family].extraRestrictions ? [STYLE_FAMILIES[style.family].extraRestrictions as string] : [],
    } satisfies ImagePromptSpec);
  let prompt = buildPrompt();

  const baseGeneration = (): GenerationMeta => ({
    useCase,
    family: style.family,
    variant: style.variant?.id,
    treatment: overlay?.treatment,
    purpose,
    concept,
    prompt,
    model: "",
    provider: "mock",
    attempts,
    costUsd,
    overlayApplied: false,
    references: { product: productRefs.length, person: personRefs.length },
    aspect: rules.aspect,
    isMock: false,
    createdAt: new Date().toISOString(),
    events,
  });

  // 6. Ruteo + intentos
  const available = imageProvidersAvailable();
  if (!available.gemini && !available.openai) {
    return {
      status: "error",
      error: "No hay proveedor de imágenes configurado (GEMINI_API_KEY u OPENAI_API_KEY).",
      warnings,
      generation: { ...baseGeneration(), isMock: true },
      meta: { provider: "mock", durationMs: Date.now() - startedAt, warning: "Sin proveedor de imágenes" },
    };
  }
  const route = routeFor(useCase, available);
  const plan: ImageModelRef[] = [route.primary, route.primary, route.fallback, route.fallback].slice(0, MAX_ATTEMPTS);
  let lastError = "";
  let qa: QaVerdict | undefined;

  for (let i = 0; i < plan.length; i++) {
    const ref = plan[i];
    const provider = getImageProviderById(ref.provider);
    if (!provider) continue;
    const t0 = Date.now();
    const references = [...productRefs, ...personRefs];
    try {
      const out = await provider.generate({
        prompt,
        aspect: rules.aspect,
        model: ref.model,
        sizeTier: ref.sizeTier,
        quality: ref.quality,
        references,
      });
      const attemptCost = estimateImageCostUsd(ref.model, { sizeTier: ref.sizeTier, quality: ref.quality, referenceCount: references.length });
      costUsd += attemptCost;
      inputTokens += out.usage?.inputTokens ?? 0;
      outputTokens += out.usage?.outputTokens ?? 0;

      // 7a. Dimensiones reales
      const dims = readImageDimensions(out.bytes);
      if (!imageMatchesAspectLoose(dims.width, dims.height, rules.aspect)) {
        attempts.push({ model: ref.model, provider: asProvider(ref.provider), outcome: "dimension_mismatch", detail: `${dims.width}x${dims.height}`, ms: Date.now() - t0 });
        events.push({ name: "image_dimension_mismatch", props: { model: ref.model, width: dims.width, height: dims.height, aspect: rules.aspect } });
        lastError = `La imagen salió ${dims.width}x${dims.height} y se pedía ${rules.aspect}.`;
        continue;
      }

      // 7b. QA de visión
      qa = await runImageQa({
        image: out.bytes,
        useCase,
        family: style.family,
        productReference: productRefs[0],
        personReference: personRefs[0],
        noFaceExpected: noFace,
        isStory,
        overlayZone: overlay?.zone,
      });
      if (!qa.passed) {
        attempts.push({ model: ref.model, provider: asProvider(ref.provider), outcome: "qa_failed", detail: qa.issues.join(" | ").slice(0, 300), ms: Date.now() - t0 });
        events.push({ name: "image_qa_failed", props: { model: ref.model, useCase, checks: qa.checks } });
        lastError = `Control de calidad: ${qa.issues[0] ?? "la imagen no pasó el control"}.`;
        // Reintento adaptativo: el próximo prompt lleva la corrección concreta.
        for (const note of retryNotesFor(qa, overlay?.zone)) if (!retryNotes.includes(note)) retryNotes.push(note);
        prompt = buildPrompt();
        continue;
      }

      // 8. Resize exacto + JPEG
      const finalImg = await finalizeImage(out.bytes, { width: rules.width, height: rules.height });
      if (!finalImg.resized) warnings.push("Sin `sharp`: la imagen no se redimensionó a las medidas exactas de la red.");
      let bytes = finalImg.bytes;
      let mimeType = finalImg.mimeType;
      let overlayApplied = false;

      // 9. Overlay de texto
      if (overlay) {
        try {
          const composed = await applyOverlay(out.bytes, {
            spec: overlay,
            aspect: rules.aspect,
            palette,
            font: { family: bk?.typography?.heading?.family, fileUrl: bk?.typography?.heading?.fileUrl },
            safeArea: rules.safeArea,
            overImage: true,
          });
          if (composed) {
            bytes = composed.bytes;
            mimeType = composed.mimeType;
            overlayApplied = true;
          } else {
            warnings.push("No se pudo componer el texto sobre la imagen (falta `sharp`): queda el fondo sin texto.");
          }
        } catch (e) {
          warnings.push(`No se pudo componer el texto sobre la imagen: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      attempts.push({ model: ref.model, provider: asProvider(ref.provider), outcome: "ok", ms: Date.now() - t0 });
      if (i >= 2) events.push({ name: "image_fallback_used", props: { model: ref.model, useCase } });
      const generation: GenerationMeta = {
        ...baseGeneration(),
        model: ref.model,
        provider: asProvider(ref.provider),
        costUsd,
        qa,
        overlayApplied,
        width: finalImg.width,
        height: finalImg.height,
      };
      return {
        status: "generada",
        bytes,
        mimeType,
        width: finalImg.width,
        height: finalImg.height,
        generation,
        warnings,
        meta: {
          provider: asProvider(ref.provider),
          model: ref.model,
          durationMs: Date.now() - startedAt,
          usage: { inputTokens, outputTokens, costUsd },
        },
      };
    } catch (e) {
      const err = e instanceof ImageProviderError ? e : new ImageProviderError(e instanceof Error ? e.message : String(e), "unknown");
      const outcome: GenerationAttempt["outcome"] =
        err.kind === "moderation_blocked" ? "moderation_blocked" : err.kind === "timeout" ? "timeout" : "provider_error";
      attempts.push({ model: ref.model, provider: asProvider(ref.provider), outcome, detail: err.message.slice(0, 300), ms: Date.now() - t0 });
      lastError = err.message;
      if (err.kind === "moderation_blocked") {
        events.push({ name: "image_moderation_blocked", props: { model: ref.model, useCase } });
        if (personRefs.length) {
          // Rechazo con la foto del profesional → composición sin rostro, nunca una cara genérica.
          personRefs = [];
          noFace = true;
          useCase = decideUseCase(style, { product: productRefs.length, person: 0 }, concept);
          prompt = buildPrompt();
          events.push({ name: "image_no_face_rule_applied", props: { reason: "moderation_blocked" } });
        }
      }
      if (err.kind === "auth") {
        // Proveedor mal configurado: no insistir con el mismo.
        for (let j = i + 1; j < plan.length; j++) if (plan[j].provider === ref.provider) plan[j] = route.fallback.provider === ref.provider ? route.primary : route.fallback;
      }
      continue;
    }
  }

  return {
    status: "error",
    error: lastError || "No se pudo generar la imagen.",
    warnings,
    generation: { ...baseGeneration(), qa, costUsd },
    meta: {
      provider: "mock",
      durationMs: Date.now() - startedAt,
      usage: { inputTokens, outputTokens, costUsd },
      warning: lastError || "No se pudo generar la imagen.",
    },
  };
}
