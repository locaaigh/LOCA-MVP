// ─────────────────────────────────────────────────────────────
// Control de calidad ANTES de mostrar la imagen: veredicto estructurado de un
// modelo de visión (Claude Haiku 5.5 por defecto, ver models.ts "image-qa").
// Si falla → la pipeline regenera o cae al suplente; nunca se muestra la
// pieza fallida. Si el QA no está disponible, no bloquea (passed=true con aviso).
//
//   AI_IMAGE_QA = on (default) | off
//   AI_IMAGE_FACE_STRICT = true (default): "unsure" en identidad del profesional = descartar
// ─────────────────────────────────────────────────────────────
import type { ImageFamilyId, ImageUseCase, QaVerdict } from "../types";
import { getAgentConfig } from "../models";
import { getTextProvider } from "../providers";
import type { ImageReference, InputImage } from "../providers/types";
import { downscaleForVision } from "./raster";

export interface QaInput {
  image: Buffer;
  useCase: ImageUseCase;
  family: ImageFamilyId;
  productReference?: ImageReference;
  personReference?: ImageReference;
  /** La composición NO debe tener un rostro protagonista. */
  noFaceExpected: boolean;
  isStory: boolean;
  /** La pieza lleva texto por overlay: el fondo tiene que tener zona calma. */
  overlayZone?: "top" | "bottom" | "center" | "left";
}

interface RawVerdict {
  hasText?: boolean;
  hasLogos?: boolean;
  foreignBrand?: boolean;
  anatomyOk?: boolean;
  hasProtagonistFace?: boolean;
  styleMatches?: boolean;
  productMatchesReference?: "yes" | "no" | "unsure" | "n/a";
  labelTextMatches?: "yes" | "no" | "unsure" | "n/a";
  samePerson?: "yes" | "no" | "unsure" | "n/a";
  stereotype?: boolean;
  calmZoneOk?: boolean;
  issues?: string[];
}

const FAMILY_EXPECTATION: Record<ImageFamilyId, string> = {
  fotografia: "a photorealistic photograph (not an illustration or CGI)",
  cinematografico: "a cinematic editorial photograph with deliberate lighting",
  render_3d: "a 3D render (clearly not a photograph)",
  vectorial: "a flat vector illustration with hard edges and no photographic shading",
  artistica: "a hand-made artistic illustration with visible medium and texture",
  cartoon: "a cartoon illustration with simplified characters",
  lofi: "a lo-fi collage / retro composition with visible texture and layering",
  tipografico: "a minimalist graphic background with large calm empty areas",
};

export function qaEnabled(): boolean {
  return (process.env.AI_IMAGE_QA || "on").toLowerCase() !== "off";
}

function toInput(bytes: Buffer, mimeType: string): InputImage {
  const mt = (mimeType === "image/png" || mimeType === "image/webp" || mimeType === "image/gif" ? mimeType : "image/jpeg") as InputImage["mediaType"];
  return { mediaType: mt, data: bytes.toString("base64") };
}

export async function runImageQa(input: QaInput): Promise<QaVerdict> {
  const provider = getTextProvider();
  if (!provider || !qaEnabled()) {
    return { passed: true, checks: {}, issues: [provider ? "qa_disabled" : "qa_unavailable"] };
  }
  const cfg = getAgentConfig("image-qa");
  const images: InputImage[] = [];
  const out = await downscaleForVision(input.image, 1024);
  images.push(toInput(out.bytes, out.mimeType));
  const labels = ["Image 1: the GENERATED image to evaluate."];
  if (input.productReference) {
    const r = await downscaleForVision(input.productReference.data, 768);
    images.push(toInput(r.bytes, r.mimeType));
    labels.push(`Image ${images.length}: the client's REAL product photo (reference).`);
  }
  if (input.personReference) {
    const r = await downscaleForVision(input.personReference.data, 768);
    images.push(toInput(r.bytes, r.mimeType));
    labels.push(`Image ${images.length}: the REAL person (reference).`);
  }

  const system =
    "You are a strict quality-control reviewer for AI-generated marketing images. Answer ONLY with a JSON object. Be literal and conservative: when unsure, say so.";
  const user = `${labels.join("\n")}

Evaluate Image 1. Expected style: ${FAMILY_EXPECTATION[input.family]}.
${input.noFaceExpected ? "There must be NO protagonist face (a clearly visible, recognizable face as the main subject)." : ""}
${input.isStory ? "This is a 9:16 story: key elements must not sit in the top or bottom 15%." : ""}
${input.overlayZone ? `The ${input.overlayZone} area must be calm (low detail) because text will be added later.` : ""}

Return EXACTLY:
{
  "hasText": boolean,                 // any letters, numbers, words or pseudo-text visible in Image 1
  "hasLogos": boolean,                // any logo, watermark or brand mark
  "foreignBrand": boolean,            // a brand name/logo that is NOT the client's own product
  "anatomyOk": boolean,               // hands, fingers, eyes, teeth, limbs are correct (true if no people)
  "hasProtagonistFace": boolean,      // a clearly visible face is the main subject
  "styleMatches": boolean,            // Image 1 matches the expected style
  "stereotype": boolean,              // folkloric/ethnic cliché or sexualization
  "calmZoneOk": boolean,              // the requested calm area is actually calm (true if not applicable)
  "productMatchesReference": "yes" | "no" | "unsure" | "n/a",  // same shape, colors, label as the reference product
  "labelTextMatches": "yes" | "no" | "unsure" | "n/a",         // printed label text identical to the reference
  "samePerson": "yes" | "no" | "unsure" | "n/a",               // the person in Image 1 is the same real person as the reference
  "issues": string[]                  // short, concrete problems in Spanish (max 5)
}`;

  let raw: RawVerdict;
  try {
    raw = (await provider.chatJson(system, user, {
      model: cfg.model,
      effort: cfg.effort,
      maxTokens: cfg.maxTokens ?? 1024,
      images,
    })) as RawVerdict;
  } catch (e) {
    return { passed: true, checks: {}, issues: [`qa_error: ${e instanceof Error ? e.message : String(e)}`], model: cfg.model };
  }

  const faceStrict = (process.env.AI_IMAGE_FACE_STRICT || "true").toLowerCase() !== "false";
  const checks: Record<string, boolean> = {
    noText: raw.hasText !== true,
    noLogos: raw.hasLogos !== true && raw.foreignBrand !== true,
    anatomy: raw.anatomyOk !== false,
    noStereotype: raw.stereotype !== true,
    style: raw.styleMatches !== false,
    calmZone: input.overlayZone ? raw.calmZoneOk !== false : true,
    noProtagonistFace: input.noFaceExpected ? raw.hasProtagonistFace !== true : true,
    productFidelity:
      input.useCase === "product_reference" && input.productReference
        ? raw.productMatchesReference !== "no" && raw.labelTextMatches !== "no"
        : true,
    personIdentity:
      input.useCase === "professional_reference" && input.personReference
        ? raw.samePerson === "yes" || (!faceStrict && raw.samePerson === "unsure")
        : true,
  };

  // Duros: texto, logos/marcas ajenas, anatomía, estereotipo, rostro indebido, fidelidad de producto, identidad.
  // Blandos (solo issue): estilo y zona calma (el overlay lleva scrim igual).
  const hard = ["noText", "noLogos", "anatomy", "noStereotype", "noProtagonistFace", "productFidelity", "personIdentity"];
  const failed = hard.filter((k) => !checks[k]);
  const issues = [...(Array.isArray(raw.issues) ? raw.issues.slice(0, 5).map(String) : [])];
  if (!checks.style) issues.push("El estilo no coincide del todo con la familia elegida.");
  if (!checks.calmZone) issues.push("La zona calma para el texto no quedó tan limpia como se pidió.");
  if (raw.productMatchesReference === "unsure") issues.push("Fidelidad del producto no confirmada por el revisor.");

  return {
    passed: failed.length === 0,
    checks,
    issues: failed.length ? [`Fallaron: ${failed.join(", ")}`, ...issues] : issues,
    samePerson: raw.samePerson && raw.samePerson !== "n/a" ? raw.samePerson : undefined,
    model: cfg.model,
  };
}
