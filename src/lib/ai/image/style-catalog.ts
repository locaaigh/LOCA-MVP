// ─────────────────────────────────────────────────────────────
// Catálogo de estilos visuales (fuente: NUEVO/estilos-visuales-y-prompting.md,
// definición de producto 2026-10-08). 7 familias de imagen + el sistema
// tipográfico, con variantes, bloques de estilo en inglés (capa 3 del prompt),
// descripción para el usuario, thumbnail, default por industria, pares
// compatibles y compatibilidad familia ↔ sujeto.
// Los prompts van en inglés porque los modelos responden mejor así.
// ─────────────────────────────────────────────────────────────
import type { ImageFamilyId, PiecePurpose, TypographicSystemId } from "../types";

export interface StyleVariant {
  id: string;
  label: string;
  description: string;
  styleBlock: string;
}

export interface StyleFamily {
  id: ImageFamilyId;
  label: string;
  /** Lo que ve el usuario en el selector. */
  description: string;
  /** Capa 3 del prompt cuando no hay variante. */
  styleBlock: string;
  /** Archivo de `IMAGENES DE ESTILOS VISUALES` para el selector. */
  thumbnail: string;
  variants: StyleVariant[];
  /** Restricción extra para la capa 7. */
  extraRestrictions?: string;
}

export const STYLE_FAMILIES: Record<ImageFamilyId, StyleFamily> = {
  fotografia: {
    id: "fotografia",
    label: "Fotografía",
    description: "Fotos reales de tu producto, tu local y tu gente. Es lo que más confianza genera.",
    styleBlock:
      "Photorealistic photography shot on a full-frame camera with a 50mm lens, natural light, true-to-life colors, realistic textures and materials, shallow depth of field, no illustration or CGI look.",
    thumbnail: "LOCA_Estilo-visual_Fotografia.jpg",
    variants: [
      {
        id: "producto_limpio",
        label: "Producto limpio",
        description: "Tu producto en estudio, fondo liso, sin distracciones.",
        styleBlock:
          "Clean studio product photography, seamless solid background in the brand color, soft diffused lighting from a large softbox, subtle ground shadow, product centered and sharp edge to edge, commercial catalog quality.",
      },
      {
        id: "lifestyle",
        label: "Lifestyle",
        description: "Tu producto en uso, en una escena real y cálida.",
        styleBlock:
          "Lifestyle photography, product in real use in a lived-in environment, warm natural light, candid framing, slightly off-center composition, authentic props, no staged perfection.",
      },
      {
        id: "candid_analogico",
        label: "Candid con grano analógico",
        description: "Fotos espontáneas con look de película, imperfectas a propósito.",
        styleBlock:
          "Candid snapshot aesthetic on 35mm color film, visible fine grain, slightly warm faded tones, soft halation on highlights, on-camera flash feel or available light, imperfect framing, authentic everyday moment.",
      },
      {
        id: "food_retail_saturado",
        label: "Food y retail saturado",
        description: "Colores vivos y apetitosos, ideal para comida y tiendas.",
        styleBlock:
          "Vibrant commercial food and retail photography, saturated but natural colors, high micro-contrast, glossy highlights on surfaces, top-down or 45-degree angle, crisp focus, appetizing and energetic.",
      },
    ],
  },
  cinematografico: {
    id: "cinematografico",
    label: "Cinematográfico / editorial",
    description: "Luz y clima de película o revista. Se ve premium.",
    styleBlock:
      "Cinematic editorial photography, deliberate dramatic lighting with a clear key light and deep soft shadows, controlled color grading, anamorphic-style framing, premium magazine mood, every element intentional.",
    thumbnail: "LOCA_Estilo-visual_Cinematografico.jpg",
    variants: [
      {
        id: "moody",
        label: "Moody",
        description: "Oscuro, íntimo, con contraste fuerte.",
        styleBlock:
          "Low-key cinematic lighting, dark background, single warm key light, rich shadows with detail, teal and amber grade, intimate and dramatic.",
      },
      {
        id: "editorial_minimal",
        label: "Editorial minimal",
        description: "Claro, limpio, elegante, como revista de diseño.",
        styleBlock:
          "High-key editorial photography, bright airy light, neutral and pale palette, lots of negative space, precise minimal composition, matte surfaces, calm and refined.",
      },
      {
        id: "monocromo_b2b",
        label: "Monocromo B2B",
        description: "Blanco y negro sobrio, serio, para servicios profesionales.",
        styleBlock:
          "Black and white editorial photography with one restrained accent of the brand color, strong tonal range, architectural composition, professional and sober, no sentimentality.",
      },
    ],
  },
  render_3d: {
    id: "render_3d",
    label: "Render 3D",
    description: "Objetos y escenas en 3D, limpias y modernas. Muy usado por marcas tech.",
    styleBlock:
      "High-quality 3D render, clean studio environment, soft global illumination, physically based materials, smooth surfaces, subtle ambient occlusion, rendered look clearly distinct from a photograph.",
    thumbnail: "LOCA_Estilo-visual_Render3D.jpg",
    variants: [
      {
        id: "clay",
        label: "Clay",
        description: "Como plastilina: suave, amable, redondeado.",
        styleBlock:
          "Claymation-style 3D render, matte clay materials with subtle fingerprints, rounded soft shapes, pastel palette, gentle studio lighting, playful and tactile.",
      },
      {
        id: "cgi_glossy",
        label: "CGI táctil glossy",
        description: "Brillante, pulido, con materiales que dan ganas de tocar.",
        styleBlock:
          "Glossy tactile CGI, reflective and translucent materials, soft gradients, chrome and glass accents, vivid saturated palette, studio HDRI lighting, premium tech aesthetic.",
      },
      {
        id: "isometrico",
        label: "Isométrico",
        description: "Escenas en miniatura vistas desde arriba en diagonal.",
        styleBlock:
          "Isometric 3D illustration, 30-degree orthographic view, miniature diorama scene, clean geometry, flat-shaded materials with soft shadows, orderly composition.",
      },
      {
        id: "surreal",
        label: "Surreal",
        description: "Escenas imposibles, oníricas, llaman la atención.",
        styleBlock:
          "Surreal 3D render, impossible scale and floating elements, dreamlike soft lighting, pastel sky background, hyper-smooth materials, calm and uncanny.",
      },
    ],
  },
  vectorial: {
    id: "vectorial",
    label: "Ilustración vectorial / flat",
    description: "Dibujos planos y limpios, con formas simples. Modernos y fáciles de leer.",
    styleBlock:
      "Flat vector illustration, solid fills with no gradients or photographic shading, clean geometric shapes, bold simplified forms, limited palette of four to five colors, crisp edges, consistent line weight.",
    thumbnail: "LOCA_estilo-visual_ilustracion-vectorial-flat.jpg",
    variants: [
      {
        id: "flat_geometrico",
        label: "Flat geométrico",
        description: "Formas simples y colores planos.",
        styleBlock:
          "Geometric flat illustration, shapes built from circles, rectangles and simple curves, solid color blocks, no outlines, subtle offset shadows in a darker tone of the same color.",
      },
      {
        id: "monoline",
        label: "Monoline / line art",
        description: "Dibujo de una sola línea, elegante y liviano.",
        styleBlock:
          "Monoline line art illustration, single continuous stroke of uniform weight in the brand color on a plain light background, minimal fills, elegant and airy.",
      },
      {
        id: "paper_cut",
        label: "Paper cut",
        description: "Como recortes de papel en capas, con relieve.",
        styleBlock:
          "Layered paper cut illustration, stacked colored paper shapes with soft drop shadows between layers, slightly textured paper surface, depth through layering, warm palette.",
      },
    ],
  },
  tipografico: {
    id: "tipografico",
    label: "Diseño gráfico minimalista tipográfico",
    description: "Cómo se ven tus piezas con texto: promos, tips, anuncios y frases.",
    styleBlock:
      "Minimalist graphic design background for a typographic poster, large areas of flat or softly textured color in the brand palette, one small supporting visual element, strong grid feel, generous empty space reserved for text, no text of any kind.",
    thumbnail: "LOCA_estilo-visual_minimalista_tipografico.jpg",
    extraRestrictions: "no numbers",
    variants: [
      {
        id: "minimal_serif",
        label: "Minimal serif",
        description: "Sobrio y elegante, letras con serif, mucho aire.",
        styleBlock:
          "Refined minimal background, off-white or pale neutral tone, faint paper texture, one thin rule or small photographic detail, museum-catalog calm.",
      },
      {
        id: "bold_oversized",
        label: "Bold oversized",
        description: "Letras gigantes y colores fuertes, para llamar la atención.",
        styleBlock:
          "High-contrast flat background in two bold brand colors split diagonally or in blocks, hard edges, poster energy, space reserved for very large type.",
      },
      {
        id: "promo",
        label: "Promo / oferta",
        description: "Para descuentos y lanzamientos, claro y directo.",
        styleBlock:
          "Clean commercial promo background, brand color field with a subtle radial highlight behind the product area, a product cutout zone at the bottom, space for price and call to action at the top.",
      },
    ],
  },
  artistica: {
    id: "artistica",
    label: "Ilustración artística",
    description: "Dibujos y pinturas con textura y trazo visible. Cálido y humano.",
    styleBlock:
      "Hand-made artistic illustration with visible medium and texture, expressive but controlled strokes, natural paper surface showing through, harmonious limited palette, warm and human, clearly not a photograph or a vector.",
    thumbnail: "LOCA_estilo-visual_ilustracion_artistica.jpg",
    variants: [
      {
        id: "acuarela",
        label: "Acuarela",
        description: "Pintura suave con manchas de agua y bordes difusos.",
        styleBlock:
          "Watercolor painting, translucent washes, soft wet edges and blooms, white paper showing through highlights, light pencil underdrawing visible, delicate and airy.",
      },
      {
        id: "doodle",
        label: "Hand-drawn / doodle",
        description: "Dibujo a mano alzada, simple y simpático, como en un cuaderno.",
        styleBlock:
          "Hand-drawn doodle illustration in ink or marker, loose confident lines, small imperfections, spot color fills in the brand palette, sketchbook feel on cream paper.",
      },
      {
        id: "risograph",
        label: "Risograph / zine",
        description: "Impresión retro con dos o tres tintas y texturas de grano.",
        styleBlock:
          "Risograph print aesthetic, two or three overlapping spot-color ink layers slightly misregistered, coarse halftone grain, flat shapes, zine and indie-print character.",
      },
      {
        id: "gouache",
        label: "Gouache editorial",
        description: "Pintura opaca y plana, como ilustración de revista.",
        styleBlock:
          "Gouache editorial illustration, opaque matte paint, flat planes of color with visible brush texture, simplified shapes, sophisticated muted palette, contemporary magazine illustration.",
      },
    ],
  },
  cartoon: {
    id: "cartoon",
    label: "Cartoon / mascota",
    description: "Personajes y escenas animadas, expresivas y divertidas. Si tenés mascota de marca, es acá.",
    styleBlock:
      "Cartoon illustration with expressive simplified characters, clean confident outlines, bright friendly palette, exaggerated proportions and emotions, smooth cel shading, consistent character design, animated-series quality.",
    thumbnail: "LOCA_estilo-visual_cartoon-mascota.jpg",
    extraRestrictions: "no existing copyrighted characters",
    variants: [
      {
        id: "cartoon_amable",
        label: "Cartoon amable",
        description: "Personajes redondeados y simpáticos para todo público.",
        styleBlock:
          "Friendly rounded cartoon style, thick soft outlines, big expressive eyes, warm saturated palette, gentle cel shading, approachable and family-safe.",
      },
      {
        id: "kawaii",
        label: "Kawaii pastel",
        description: "Tierno y pastel, estilo japonés simplificado.",
        styleBlock:
          "Kawaii illustration, pastel palette, tiny dot eyes and blush cheeks, very simple rounded forms, soft shading, sparkles and small hearts as decoration.",
      },
      {
        id: "pop_art",
        label: "Cómic / pop art",
        description: "Viñetas, tramas de puntos y colores fuertes.",
        styleBlock:
          "Comic book pop art style, bold black ink outlines, Ben-Day dot halftone shading, primary colors, dynamic angles, action-panel energy, no speech bubbles.",
      },
    ],
  },
  lofi: {
    id: "lofi",
    label: "Lo-fi / collage / retro",
    description: "Imperfecto a propósito: recortes, texturas, nostalgia. Se nota hecho a mano y no se parece a lo que hace la IA.",
    styleBlock:
      "Lo-fi collage aesthetic, layered cut-out elements with torn paper edges, mixed textures of scanned paper, tape and grain, slightly faded retro colors, intentional imperfection and hand-assembled feel, scrapbook composition.",
    thumbnail: "LOCA_estilo-visual_lofi-collage-retro.jpg",
    extraRestrictions: "no readable print clippings",
    variants: [
      {
        id: "scrapbook",
        label: "Scrapbook collage",
        description: "Recortes, cinta y papel con textura.",
        styleBlock:
          "Scrapbook collage, photo cut-outs with white borders, masking tape, torn kraft and notebook paper layers, hand-placed stickers, visible scanner grain.",
      },
      {
        id: "retro_calido",
        label: "Retro cálido",
        description: "Nostalgia de los 70 y 90, colores cálidos y desgastados.",
        styleBlock:
          "Warm vintage aesthetic, 1970s to 1990s color palette of mustard, burnt orange, teal and cream, faded print texture, soft vignette, slightly worn edges, nostalgic.",
      },
      {
        id: "y2k",
        label: "Early internet / Y2K",
        description: "Estética de los 2000: brillos, degradés y pixeles.",
        styleBlock:
          "Y2K early-internet aesthetic, glossy chrome gradients, lens flares, pixelated edges, bright cyan and magenta accents, low-fi digital artifacts, playful and nostalgic.",
      },
    ],
  },
};

/** Familias de IMAGEN (sin el sistema tipográfico, que convive con cualquiera). */
export const IMAGE_FAMILY_IDS: ImageFamilyId[] = [
  "fotografia",
  "cinematografico",
  "render_3d",
  "vectorial",
  "artistica",
  "cartoon",
  "lofi",
];

/** Tratamientos tipográficos: fondo + fuente + layout del overlay. */
export interface TypographicTreatment {
  id: TypographicSystemId;
  label: string;
  description: string;
  /** Bloque de estilo del FONDO generado (zona calma). */
  backgroundBlock: string;
  /** Fuente por defecto si el brand kit no tiene una (Google Fonts). */
  defaultFont: { family: string; weight: number };
  /** Zona del texto por defecto. */
  zone: "top" | "bottom" | "center" | "left";
}

export const TYPOGRAPHIC_TREATMENTS: Record<TypographicSystemId, TypographicTreatment> = {
  minimal_serif: {
    id: "minimal_serif",
    label: "Minimal serif",
    description: "Sobrio y elegante, letras con serif, mucho aire.",
    backgroundBlock: STYLE_FAMILIES.tipografico.variants[0].styleBlock,
    defaultFont: { family: "Playfair Display", weight: 600 },
    zone: "bottom",
  },
  bold_oversized: {
    id: "bold_oversized",
    label: "Bold oversized",
    description: "Letras gigantes y colores fuertes, para llamar la atención.",
    backgroundBlock: STYLE_FAMILIES.tipografico.variants[1].styleBlock,
    defaultFont: { family: "Inter", weight: 900 },
    zone: "center",
  },
  promo: {
    id: "promo",
    label: "Promo / oferta",
    description: "Para descuentos y lanzamientos, claro y directo.",
    backgroundBlock: STYLE_FAMILIES.tipografico.variants[2].styleBlock,
    defaultFont: { family: "Montserrat", weight: 800 },
    zone: "top",
  },
};

/** Pares compatibles para la familia secundaria (sección 3b del doc). */
export const SECONDARY_COMPATIBLE: Record<ImageFamilyId, ImageFamilyId[]> = {
  fotografia: ["cinematografico", "lofi", "vectorial"],
  cinematografico: ["fotografia", "tipografico"],
  render_3d: ["vectorial", "tipografico"],
  vectorial: ["cartoon", "render_3d", "fotografia"],
  artistica: ["lofi", "fotografia"],
  cartoon: ["vectorial"],
  lofi: ["fotografia", "artistica"],
  tipografico: IMAGE_FAMILY_IDS,
};

/** Sujeto ↔ familia (sección 3 del doc). */
export const PRODUCT_REFERENCE_FAMILIES: ImageFamilyId[] = ["fotografia", "cinematografico", "tipografico"];
export const PROFESSIONAL_REFERENCE_FAMILIES: ImageFamilyId[] = ["fotografia", "cinematografico"];
export const MASCOT_FAMILIES: ImageFamilyId[] = ["cartoon", "vectorial", "render_3d"];

/** Propósitos que usan el sistema tipográfico (texto por overlay) en vez de la familia de imagen. */
export const TYPOGRAPHIC_PURPOSES: PiecePurpose[] = ["educativo", "promo", "testimonio"];
/** Propósitos que llevan un titular corto por overlay sobre la imagen de la familia. */
export const HEADLINE_OVERLAY_PURPOSES: PiecePurpose[] = ["fecha_especial"];

/** Mapa de los 7 ids viejos de `VISUAL_STYLES` (onboarding actual) a familias. */
export const LEGACY_VISUAL_STYLE_MAP: Record<string, { family: ImageFamilyId; variant?: string }> = {
  fotorrealista: { family: "fotografia" },
  render_3d: { family: "render_3d" },
  vectorial: { family: "vectorial" },
  minimalista_tipografico: { family: "tipografico", variant: "minimal_serif" },
  ilustracion_artistica: { family: "artistica" },
  cartoon_anime: { family: "cartoon" },
  cinematografico: { family: "cinematografico" },
};

/** Default por industria (sección 5 del doc). Inferido, no medido: se ajusta con datos del piloto. */
interface IndustryDefault {
  match: RegExp;
  family: ImageFamilyId;
  variant?: string;
  typographic: TypographicSystemId;
}
const INDUSTRY_DEFAULTS: IndustryDefault[] = [
  { match: /food|beverage|gastro|caf|restaur|panader|pasteler|helader|bar\b/i, family: "fotografia", variant: "food_retail_saturado", typographic: "minimal_serif" },
  { match: /beauty|personal care|belleza|est[ée]tica|peluquer|barber|spa|u[ñn]as|maquillaje/i, family: "cinematografico", variant: "editorial_minimal", typographic: "minimal_serif" },
  { match: /health|wellness|salud|odont|psic|nutri|m[ée]dic|kinesi/i, family: "tipografico", variant: "minimal_serif", typographic: "minimal_serif" },
  { match: /fashion|accessor|retail|local stores|tienda|indument|moda|e-?commerce|online store/i, family: "fotografia", variant: "producto_limpio", typographic: "bold_oversized" },
  { match: /real estate|inmobil|arquitect|construction|home renovation/i, family: "fotografia", variant: "lifestyle", typographic: "minimal_serif" },
  { match: /education|training|educaci|curso|coaching|consulting/i, family: "artistica", variant: "doodle", typographic: "bold_oversized" },
  { match: /professional services|financial|legal|contad|abogad|consultor|marketing & advertising/i, family: "cinematografico", variant: "monocromo_b2b", typographic: "minimal_serif" },
  { match: /tech|software|startup|saas/i, family: "render_3d", variant: "clay", typographic: "bold_oversized" },
  { match: /sport|fitness|gym|deporte/i, family: "cinematografico", variant: "moody", typographic: "bold_oversized" },
  { match: /pet|mascota|ni[ñn]o|kids|hogar|home services/i, family: "cartoon", variant: "cartoon_amable", typographic: "promo" },
  { match: /events|entertainment|m[úu]sica|creative|arts|crafts|artesan/i, family: "lofi", variant: "scrapbook", typographic: "bold_oversized" },
  { match: /travel|tourism|hospitality|turismo|hotel/i, family: "fotografia", variant: "lifestyle", typographic: "minimal_serif" },
  { match: /automotive|manufactur|agricult|natural products/i, family: "fotografia", variant: "lifestyle", typographic: "bold_oversized" },
];

export function industryDefaultStyle(industry: string, subcategory?: string): {
  family: ImageFamilyId;
  variant?: string;
  typographic: TypographicSystemId;
} {
  const hay = `${industry || ""} ${subcategory || ""}`;
  const hit = INDUSTRY_DEFAULTS.find((d) => d.match.test(hay));
  return hit
    ? { family: hit.family, variant: hit.variant, typographic: hit.typographic }
    : { family: "fotografia", variant: "lifestyle", typographic: "minimal_serif" };
}

export function getFamily(id: ImageFamilyId): StyleFamily {
  return STYLE_FAMILIES[id];
}

export function getVariant(family: ImageFamilyId, variantId?: string): StyleVariant | undefined {
  if (!variantId) return undefined;
  return STYLE_FAMILIES[family].variants.find((v) => v.id === variantId);
}

export function isValidFamily(id: unknown): id is ImageFamilyId {
  return typeof id === "string" && id in STYLE_FAMILIES;
}

export function isValidTypographic(id: unknown): id is TypographicSystemId {
  return typeof id === "string" && id in TYPOGRAPHIC_TREATMENTS;
}
