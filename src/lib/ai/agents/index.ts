import { calendarAgent } from "./calendar";
import { contentAgent } from "./content";
import { contentFeedbackAgent } from "./content-feedback";
import { googleAdsAgent } from "./ads-google";
import { imageAgent } from "./image";
import { metaAdsAgent } from "./ads-meta";
import { productDescriptionAgent } from "./product-description";
import { strategyAgent } from "./strategy";
import { websiteExtractAgent } from "./website-extract";

/** Registro de agentes de Eva (cada uno con responsabilidad única). */
export const agents = {
  strategy: strategyAgent,
  calendar: calendarAgent,
  content: contentAgent,
  contentFeedback: contentFeedbackAgent,
  metaAds: metaAdsAgent,
  googleAds: googleAdsAgent,
  productDescription: productDescriptionAgent,
  image: imageAgent,
  websiteExtract: websiteExtractAgent,
} as const;

export type AgentId = keyof typeof agents;

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
};
