// ─────────────────────────────────────────────────────────────
// Deriva el estilo de UNA pieza a partir de lo que eligió el usuario en el
// brand kit (o de los defaults) y del propósito de la pieza. El usuario no
// elige estilo por pieza: elige familia + sistema tipográfico una vez.
// ─────────────────────────────────────────────────────────────
import type { Business } from "@/lib/types";
import type { BrandStyleConfig, ImageFamilyId, PiecePurpose, TypographicSystemId } from "../types";
import {
  HEADLINE_OVERLAY_PURPOSES,
  IMAGE_FAMILY_IDS,
  LEGACY_VISUAL_STYLE_MAP,
  SECONDARY_COMPATIBLE,
  STYLE_FAMILIES,
  TYPOGRAPHIC_PURPOSES,
  TYPOGRAPHIC_TREATMENTS,
  getVariant,
  industryDefaultStyle,
  isValidFamily,
  isValidTypographic,
  type StyleVariant,
  type TypographicTreatment,
} from "./style-catalog";

export interface ResolvedPieceStyle {
  /** Familia de imagen cuyo bloque va en la capa 3 (para piezas tipográficas, la familia del FONDO). */
  family: ImageFamilyId;
  variant?: StyleVariant;
  /** Capa 3 del prompt. */
  styleBlock: string;
  /** La pieza lleva texto por overlay con el sistema tipográfico (educativo, promo, testimonio). */
  usesTypographic: boolean;
  /** Imagen de la familia + titular corto por overlay (fecha especial). */
  headlineOverlay: boolean;
  treatment: TypographicTreatment;
  /** Fracción de la imagen que debe quedar calma para el texto (0 si no lleva overlay). */
  calmZoneFraction: number;
  localFlavor: boolean;
  config: BrandStyleConfig;
}

/** Configuración efectiva de estilo del negocio: brand kit → visualStyles viejos → default por industria. */
export function resolveBrandStyle(business: Business): BrandStyleConfig {
  const saved = business.brandKit?.style;
  const industry = industryDefaultStyle(business.industry, business.subcategory);

  if (saved?.primaryFamily && isValidFamily(saved.primaryFamily)) {
    const primaryFamily = saved.primaryFamily === "tipografico" ? industry.family : saved.primaryFamily;
    const secondaryOk =
      saved.secondaryFamily &&
      isValidFamily(saved.secondaryFamily) &&
      SECONDARY_COMPATIBLE[primaryFamily].includes(saved.secondaryFamily);
    return {
      primaryFamily,
      primaryVariant: getVariant(primaryFamily, saved.primaryVariant)?.id,
      secondaryFamily: secondaryOk ? saved.secondaryFamily : undefined,
      secondaryPurposes: saved.secondaryPurposes?.length ? saved.secondaryPurposes : ["educativo"],
      typographicSystem: isValidTypographic(saved.typographicSystem) ? saved.typographicSystem : industry.typographic,
      localFlavor: saved.localFlavor ?? true,
      source: "user",
    };
  }

  // Mapeo de los estilos del onboarding actual (multi-select de 7 ids).
  const legacy = (business.visualStyles ?? [])
    .map((id) => LEGACY_VISUAL_STYLE_MAP[id])
    .filter(Boolean);
  const legacyImage = legacy.find((l) => l.family !== "tipografico");
  const legacyTypo = legacy.find((l) => l.family === "tipografico");
  if (legacyImage) {
    const second = legacy.find(
      (l) => l.family !== "tipografico" && l.family !== legacyImage.family && SECONDARY_COMPATIBLE[legacyImage.family].includes(l.family)
    );
    return {
      primaryFamily: legacyImage.family,
      primaryVariant: undefined,
      secondaryFamily: second?.family,
      secondaryPurposes: ["educativo"],
      typographicSystem: (legacyTypo?.variant as TypographicSystemId | undefined) ?? industry.typographic,
      localFlavor: true,
      source: "legacy_visual_styles",
    };
  }

  return {
    primaryFamily: industry.family === "tipografico" ? "fotografia" : industry.family,
    primaryVariant: industry.family === "tipografico" ? "lifestyle" : industry.variant,
    secondaryFamily: undefined,
    secondaryPurposes: ["educativo"],
    typographicSystem: industry.typographic,
    localFlavor: true,
    source: "industry_default",
  };
}

/** Rotación de variantes: 70% la elegida, 30% rotando en la familia; sin elegida, rota en orden fijo. */
function pickVariant(family: ImageFamilyId, chosen: string | undefined, pieceIndex: number): StyleVariant | undefined {
  const variants = STYLE_FAMILIES[family].variants;
  if (!variants.length) return undefined;
  const idx = Math.max(0, pieceIndex);
  if (chosen) {
    const chosenVariant = variants.find((v) => v.id === chosen);
    if (chosenVariant) {
      // Posiciones 7, 8, 9 de cada bloque de 10 rotan entre las otras variantes.
      if (idx % 10 < 7) return chosenVariant;
      const others = variants.filter((v) => v.id !== chosen);
      return others.length ? others[Math.floor(idx / 10 + (idx % 10)) % others.length] : chosenVariant;
    }
  }
  return variants[idx % variants.length];
}

export function resolvePieceStyle(business: Business, purpose: PiecePurpose, pieceIndex = 0): ResolvedPieceStyle {
  const config = resolveBrandStyle(business);
  const primary = config.primaryFamily && IMAGE_FAMILY_IDS.includes(config.primaryFamily) ? config.primaryFamily : "fotografia";
  const treatment = TYPOGRAPHIC_TREATMENTS[config.typographicSystem ?? "minimal_serif"];
  const localFlavor = config.localFlavor ?? true;

  const usesTypographic = TYPOGRAPHIC_PURPOSES.includes(purpose);
  const headlineOverlay = HEADLINE_OVERLAY_PURPOSES.includes(purpose);

  if (usesTypographic) {
    const secondaryApplies =
      config.secondaryFamily && (config.secondaryPurposes ?? ["educativo"]).includes(purpose);
    if (secondaryApplies && config.secondaryFamily) {
      // Fondo de la familia secundaria con zona calma del 60%; el texto va por overlay.
      const variant = pickVariant(config.secondaryFamily, undefined, pieceIndex);
      return {
        family: config.secondaryFamily,
        variant,
        styleBlock: variant?.styleBlock ?? STYLE_FAMILIES[config.secondaryFamily].styleBlock,
        usesTypographic: true,
        headlineOverlay: false,
        treatment,
        calmZoneFraction: 0.6,
        localFlavor,
        config,
      };
    }
    // Fondo del sistema tipográfico (campo de color, zona calma grande).
    const variant = getVariant("tipografico", treatment.id);
    return {
      family: "tipografico",
      variant,
      styleBlock: `${STYLE_FAMILIES.tipografico.styleBlock} ${treatment.backgroundBlock}`,
      usesTypographic: true,
      headlineOverlay: false,
      treatment,
      calmZoneFraction: 0.6,
      localFlavor,
      config,
    };
  }

  const variant = pickVariant(primary, config.primaryVariant, pieceIndex);
  return {
    family: primary,
    variant,
    styleBlock: variant?.styleBlock ?? STYLE_FAMILIES[primary].styleBlock,
    usesTypographic: false,
    headlineOverlay,
    treatment,
    calmZoneFraction: headlineOverlay ? 0.33 : 0,
    localFlavor,
    config,
  };
}
