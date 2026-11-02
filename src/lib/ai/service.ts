// Facade de compatibilidad — delega a agentes especializados.
export {
  strategyAgent,
  calendarAgent,
  contentAgent,
  carouselAgent,
  contentFeedbackAgent,
  metaAdsAgent,
  googleAdsAgent,
  productDescriptionAgent,
  imageAgent,
  websiteExtractAgent,
  websiteVisionAgent,
  agents,
} from "./agents";

import {
  strategyAgent,
  calendarAgent,
  contentAgent,
  contentFeedbackAgent,
  metaAdsAgent,
  googleAdsAgent,
  productDescriptionAgent,
  imageAgent,
  websiteExtractAgent,
} from "./agents";
import type { ImageFormat } from "@/lib/types";
import { getImageProvider } from "./providers";
import { legacyRef } from "./image/routing";
import { toDataUrl } from "./image/raster";

export const generateBusinessStrategy = (business: Parameters<typeof strategyAgent.run>[0]["business"], feedback?: string) =>
  strategyAgent.run({ business, feedback });

export const generateContentCalendar = (
  business: Parameters<typeof calendarAgent.run>[0]["business"],
  strategy: Parameters<typeof calendarAgent.run>[0]["strategy"],
  count: number,
  feedback?: string
) => calendarAgent.run({ business, strategy, count, feedback });

export const generateContentPiece = (
  business: Parameters<typeof contentAgent.run>[0]["business"],
  strategy: Parameters<typeof contentAgent.run>[0]["strategy"],
  calendarItem: Parameters<typeof contentAgent.run>[0]["calendarItem"]
) => contentAgent.run({ business, strategy, calendarItem });

export const regenerateContentWithFeedback = (
  business: Parameters<typeof contentFeedbackAgent.run>[0]["business"],
  item: Parameters<typeof contentFeedbackAgent.run>[0]["item"],
  feedbackText: string
) => contentFeedbackAgent.run({ business, item, feedbackText });

/** Pipeline completo (estilo, referencias, ruteo, QA, overlay). Preferir esto. */
export const generateImageForPiece = (
  business: Parameters<typeof imageAgent.run>[0]["business"],
  content: Parameters<typeof imageAgent.run>[0]["content"]
) => imageAgent.run({ business, content }).then((r) => r.data);

/**
 * @deprecated Camino legacy "prompt suelto → modelo default", sin ruteo ni QA.
 * Queda solo para compatibilidad; usar generateImageForPiece.
 */
export async function generateImageForContent(prompt: string, format: ImageFormat) {
  const provider = getImageProvider();
  if (!provider) return { imageUrl: "", prompt, provider: "mock" as const, status: "error" as const, error: "Sin proveedor de imágenes" };
  const ref = legacyRef();
  const out = await provider.generate({ prompt, aspect: format, model: ref.model, sizeTier: ref.sizeTier, quality: ref.quality });
  return { imageUrl: toDataUrl(out.bytes, out.mimeType), prompt, provider: provider.id, status: "generada" as const };
}

export const generateMetaAdsStrategy = (business: Parameters<typeof metaAdsAgent.run>[0]["business"]) =>
  metaAdsAgent.run({ business });

export const generateGoogleAdsStrategy = (business: Parameters<typeof googleAdsAgent.run>[0]["business"]) =>
  googleAdsAgent.run({ business });

export const extractBusinessInfoFromWebsite = (url: string) => websiteExtractAgent.run({ url });

export const generateProductServiceDescription = (
  business: Parameters<typeof productDescriptionAgent.run>[0]["business"],
  draft: Parameters<typeof productDescriptionAgent.run>[0]["draft"]
) => productDescriptionAgent.run({ business, draft });
