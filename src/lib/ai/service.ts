// Facade de compatibilidad — delega a agentes especializados.
export {
  strategyAgent,
  calendarAgent,
  contentAgent,
  contentFeedbackAgent,
  metaAdsAgent,
  googleAdsAgent,
  productDescriptionAgent,
  imageAgent,
  websiteExtractAgent,
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

export const generateImageForContent = (
  prompt: string,
  format: Parameters<typeof imageAgent.run>[0]["format"],
  label?: string,
  concept?: string
) => imageAgent.run({ prompt, format, label, concept }).then((r) => r.data);

export const generateMetaAdsStrategy = (business: Parameters<typeof metaAdsAgent.run>[0]["business"]) =>
  metaAdsAgent.run({ business });

export const generateGoogleAdsStrategy = (business: Parameters<typeof googleAdsAgent.run>[0]["business"]) =>
  googleAdsAgent.run({ business });

export const extractBusinessInfoFromWebsite = (url: string) => websiteExtractAgent.run({ url });

export const generateProductServiceDescription = (
  business: Parameters<typeof productDescriptionAgent.run>[0]["business"],
  draft: Parameters<typeof productDescriptionAgent.run>[0]["draft"]
) => productDescriptionAgent.run({ business, draft });
