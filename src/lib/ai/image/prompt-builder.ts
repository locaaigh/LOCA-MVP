// ─────────────────────────────────────────────────────────────
// imagePromptBuilder determinístico: Eva escribe SOLO el concepto; el código
// arma el prompt final en 7 capas en orden fijo. El modelo de imagen nunca
// recibe un prompt escrito libremente por otro modelo.
//
//   [1 CONCEPTO] [2 SUJETO FIEL] [3 ESTILO] [4 MARCA] [5 LOCAL] [6 FORMATO] [7 RESTRICCIONES]
// ─────────────────────────────────────────────────────────────
import type { ImageFormat } from "@/lib/types";

export interface ImagePromptSpec {
  /** Capa 1: qué se ve (sujeto, escena, acción, mood), en inglés, 1 a 3 frases. */
  concept: string;
  /** Capa 2: referencias y sus roles. */
  references: {
    product: number;
    person: number;
    mascot: number;
    productName?: string;
    /** Descripción corta de qué muestra cada foto extra (ángulo, etiqueta). */
    productNotes?: string[];
  };
  /** Composición SIN rostro protagonista (profesional sin foto, o familia no fotográfica). */
  noFace: boolean;
  /** Capa 3: bloque de estilo curado de la variante o familia. */
  styleBlock: string;
  /** Capa 4: marca. */
  brand: {
    primaryHex?: string;
    secondaryHex?: string;
    accentHex?: string;
    tone?: string;
  };
  /** Capa 5: sabor local. */
  localFlavor: boolean;
  country?: string;
  /** Capa 6: formato. */
  aspect: ImageFormat;
  composition: string;
  isStory: boolean;
  /** Zona calma para texto por overlay (si la pieza lleva texto). */
  overlay?: { zone: "top" | "bottom" | "center" | "left"; fraction: number };
  /** Capa 7: restricciones extra de la familia. */
  extraRestrictions?: string[];
  /** Correcciones derivadas de un intento anterior que falló el QA (reintento adaptativo). */
  retryNotes?: string[];
}

const COUNTRY_ADJECTIVE: Record<string, string> = {
  argentina: "Argentine",
  méxico: "Mexican",
  mexico: "Mexican",
  chile: "Chilean",
  colombia: "Colombian",
  uruguay: "Uruguayan",
  perú: "Peruvian",
  peru: "Peruvian",
  españa: "Spanish",
  brasil: "Brazilian",
};

function localAdjective(country?: string): string {
  const key = (country || "").trim().toLowerCase();
  return COUNTRY_ADJECTIVE[key] ? `${COUNTRY_ADJECTIVE[key]} / Latin American` : "Argentine / Latin American";
}

function aspectLabel(aspect: ImageFormat): string {
  switch (aspect) {
    case "4:5":
      return "4:5 vertical";
    case "9:16":
      return "9:16 vertical";
    case "1.91:1":
      return "16:9 horizontal (will be cropped to 1.91:1, keep the subject centered)";
    default:
      return "1:1 square";
  }
}

function zoneLabel(zone: "top" | "bottom" | "center" | "left"): string {
  switch (zone) {
    case "top":
      return "upper third";
    case "bottom":
      return "lower third";
    case "left":
      return "left half";
    default:
      return "central area";
  }
}

function cleanConcept(concept: string): string {
  // Sacamos instrucciones de texto que el LLM pueda haber colado ("with the text ...").
  return concept
    .replace(/\s+/g, " ")
    .replace(/\b(with|including|showing|featuring)\s+(the\s+)?(text|words?|caption|headline|slogan)\b[^.]*\.?/gi, "")
    .trim();
}

export function buildImagePrompt(spec: ImagePromptSpec): string {
  const parts: string[] = [];

  // 1. Concepto. Para piezas con texto (zona calma ≥ 50%) el concepto se encuadra
  // como FONDO: un solo elemento de apoyo y mucho vacío, no una escena cargada.
  const concept = cleanConcept(spec.concept) || "A clean, well-composed scene that represents the business.";
  if (spec.overlay && spec.overlay.fraction >= 0.5) {
    parts.push(
      `Background for a typographic poster: a single small supporting visual element and large plain, calm, empty areas. The empty areas must be a natural, seamless continuation of the background (a continuous surface, wall, sky, soft gradient or gentle blur) — never a solid panel, box, card, banner, frame, rectangle or placeholder shape. Keep only the main subject of this idea and drop the rest: ${concept}`
    );
  } else {
    parts.push(concept);
  }
  if (spec.retryNotes?.length) parts.push(`IMPORTANT, fix from the previous attempt: ${spec.retryNotes.join(" ")}`);

  // 2. Sujeto fiel
  const subject: string[] = [];
  let imageIndex = 1;
  if (spec.references.product > 0) {
    const name = spec.references.productName ? ` (${spec.references.productName})` : "";
    subject.push(
      `Image ${imageIndex} is the client's real product${name}. Keep its exact shape, proportions, colors, label and printed text unchanged. Only the scene, background and lighting are new.`
    );
    const notes = spec.references.productNotes ?? [];
    for (let i = 1; i < spec.references.product; i++) {
      const n = notes[i - 1] ? `: ${notes[i - 1]}` : " shows another angle or detail of the same product";
      subject.push(`Image ${imageIndex + i}${n}.`);
    }
    imageIndex += spec.references.product;
  }
  if (spec.references.person > 0) {
    const range = spec.references.person === 1 ? `Image ${imageIndex}` : `Images ${imageIndex}–${imageIndex + spec.references.person - 1}`;
    subject.push(
      `${range} show the same real person, the business owner. Preserve their identity, facial features, skin tone, hair and age exactly. Natural expression, no retouching beyond professional photography. Do not add other people's faces.`
    );
    imageIndex += spec.references.person;
  }
  if (spec.references.mascot > 0) {
    subject.push(
      `Image ${imageIndex} is the brand mascot. Keep its design, proportions and colors consistent.`
    );
  }
  if (spec.noFace) {
    subject.push(
      "Composition without a protagonist face: show hands, the workspace, objects, details or a person from behind or out of focus. No recognizable face."
    );
  }
  if (subject.length) parts.push(subject.join(" "));

  // 3. Estilo
  parts.push(`Style: ${spec.styleBlock}`);

  // 4. Marca
  const brand: string[] = [];
  if (spec.brand.primaryHex) brand.push(`${spec.brand.primaryHex} as the dominant tone`);
  if (spec.brand.secondaryHex) brand.push(`${spec.brand.secondaryHex} as support`);
  if (spec.brand.accentHex) brand.push(`${spec.brand.accentHex} only in small accents`);
  if (brand.length) parts.push(`Brand colors: ${brand.join(", ")}.${spec.brand.tone ? ` Overall tone: ${spec.brand.tone}.` : ""}`);
  else if (spec.brand.tone) parts.push(`Overall tone: ${spec.brand.tone}.`);

  // 5. Local
  if (spec.localFlavor) {
    parts.push(
      `Setting and people feel contemporary ${localAdjective(spec.country)}: real neighborhoods, current clothing and objects, no folkloric stereotypes.`
    );
  }

  // 6. Formato
  const fmt: string[] = [`Format: ${aspectLabel(spec.aspect)}. ${spec.composition}`];
  if (spec.overlay && spec.overlay.fraction > 0) {
    fmt.push(
      `Leave the ${zoneLabel(spec.overlay.zone)} (about ${Math.round(spec.overlay.fraction * 100)}% of the image) as calm, uncluttered negative space for text to be added later. This area must be part of the background itself (a continuous surface, sky, soft gradient or gentle blur), NOT a drawn panel, box, card, banner, frame, rectangle or grey placeholder shape.`
    );
  }
  if (spec.isStory) fmt.push("Keep all key elements out of the top and bottom 15% of the frame.");
  parts.push(fmt.join(" "));

  // 7. Restricciones
  const restrictions = [
    "No text, no letters, no numbers, no logos, no watermarks",
    "no brand names other than the client's own product",
    "no handwriting, no writing on paper, notebooks, screens, labels, packaging or signs (any such surface is completely blank)",
    "no celebrities, no recognizable real people other than the provided references",
    "correct hands and anatomy, single coherent scene",
    ...(spec.extraRestrictions ?? []),
  ];
  parts.push(restrictions.join(", ") + ".");

  return parts.join("\n\n");
}
