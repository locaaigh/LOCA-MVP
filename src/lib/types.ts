// ─────────────────────────────────────────────────────────────
// LOCA — Modelo de datos del MVP
// Todo en un solo lugar para que sea fácil de extender / migrar a DB.
// ─────────────────────────────────────────────────────────────

export type ID = string;

export type BusinessModel = "B2B" | "B2C" | "Ambos";
export type ProductServiceType = "producto" | "servicio";
export type PricingType = "fijo" | "rango" | "por_variante" | "variable";

export type Channel = "Instagram" | "Facebook" | "TikTok" | "LinkedIn";
export type ContentFormat =
  | "post_estatico"
  | "carrusel"
  | "reel"
  | "story"
  | "ad"
  | "email";

export type ImageFormat = "1:1" | "4:5" | "9:16";

export type ContentStatus =
  | "borrador"
  | "generado"
  | "aprobado"
  | "rechazado"
  | "publicado_manualmente";

export type CalendarStatus =
  | "borrador"
  | "generado"
  | "aprobado"
  | "rechazado"
  | "publicado_manualmente";

export type PublishStatus =
  | "pendiente"
  | "listo_para_publicar"
  | "publicado_manualmente";

export type ImageStatus = "pendiente" | "generando" | "generada" | "error";

export type AiProvider = "openai" | "mock";

// Estado de aprobación del flujo guiado (Formulario → Estrategia → Calendario → Contenidos)
export type ApprovalStatus = "draft" | "pending_review" | "approved" | "needs_changes";

export type ProductImportSource = "manual" | "csv" | "xlsx" | "website";

// ── Usuario ──────────────────────────────────────────────────
export interface User {
  id: ID;
  email: string;
  name: string;
  isDemo?: boolean;
  createdAt: string;
}

// ── Productos / Servicios ────────────────────────────────────
export interface ProductService {
  id: ID;
  type: ProductServiceType;
  name: string;
  category?: string;
  subcategory?: string;
  shortDescription?: string;
  longDescription?: string;
  features: string[];
  variants: string[];
  pricingType: PricingType;
  currency: string;
  priceMin?: number;
  priceMax?: number;
  imageCaption?: string;
  keywords: string[];
  negativeKeywords: string[];
  isTopSeller: boolean;
  saved?: boolean; // UI: si el usuario ya lo guardó (card minimizada)
  importSource?: ProductImportSource;
}

// ── Audiencia ────────────────────────────────────────────────
export type LocationLogic = "global" | "regional" | "pais" | "ciudad";
export type SocioeconomicLevel = "alto" | "medio_alto" | "medio" | "bajo";
export type Gender = "masculino" | "femenino" | "otro" | "todos";

export interface Audience {
  ageRanges: string[];
  gender: Gender;
  locationLogic: LocationLogic;
  locations: string[];
  socioeconomicLevel: SocioeconomicLevel;
  painPoints: string[];
  behavior: string;
  segments: string[];
}

// ── Objetivos ────────────────────────────────────────────────
export type PrimaryContentGoal = "visibilidad" | "ventas" | "confianza";
export type SalesGoalType =
  | "lead_magnet"
  | "compra_ecommerce"
  | "mensaje_whatsapp"
  | "visita_local";

export interface Goals {
  primaryContentGoal: PrimaryContentGoal;
  salesGoalType?: SalesGoalType;
  businessObjectives: string;
  successMetrics: string[];
  marketingObjectives: string;
  timeline: string;
}

// ── Negocio ──────────────────────────────────────────────────
export interface Business {
  id: ID;
  userId: ID;
  name: string;
  industry: string;
  subcategory: string;
  businessType: string;
  businessModel: BusinessModel;
  yearFounded?: string;
  employees?: string;
  country: string;
  state: string;
  city: string;
  shortDescription: string;
  fullDescription: string;
  values: string[];
  competitiveAdvantages: string[];
  // Canales en los que el negocio ya está presente (lista ampliada, no solo los 4 de publicación)
  marketingChannels: string[];
  marketingStrategy: string;
  // ¿Qué viene haciendo de marketing? (opciones seleccionables)
  marketingActivities: string[];
  // Estacionalidad y fechas especiales con lógica Sí/No
  hasSeasonality?: boolean;
  seasonality: string;
  seasonalityTags: string[];
  hasSpecialDates?: boolean;
  specialDates: string[];
  // Web del negocio + autocompletado por Eva
  hasWebsite?: boolean;
  websiteUrl?: string;
  websiteExtractionConsent?: boolean;
  websiteExtractionStatus?: "idle" | "loading" | "done" | "error";
  brandColors: string[];
  logoUrl?: string;
  productsServices: ProductService[];
  audience: Audience;
  goals: Goals;
  // Identidad visual + inteligencia de negocio (autocompletado desde la web)
  brandKit?: BrandKit;
  businessIntelligence?: BusinessIntelligence;
  // Estado por campo tras el autocompletado (found/suggested/review/missing/user)
  fieldStatuses?: Record<string, FieldStatus>;
  onboardingComplete: boolean;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Estrategia ───────────────────────────────────────────────
export interface Strategy {
  id: ID;
  businessId: ID;
  status?: ApprovalStatus;
  businessSummary: string;
  brandPositioning: string;
  audienceSummary: string;
  mainAngle: string;
  contentPillars: { name: string; description: string }[];
  toneOfVoice: string;
  recommendedChannels: Channel[];
  monthlyGoal: string;
  recommendedCta: string;
  offerIdeas: string[];
  dos: string[];
  donts: string[];
  keyMessages: string[];
  contentMix: { type: string; percentage: number }[];
  nextActions: string[];
  createdAt: string;
  updatedAt: string;
}

// ── Calendario ───────────────────────────────────────────────
export interface CalendarItem {
  id: ID;
  businessId: ID;
  strategyId: ID;
  date: string; // ISO yyyy-mm-dd
  suggestedTime: string;
  channel: Channel;
  format: ContentFormat;
  contentPillar: string;
  objective: string;
  topic: string;
  status: CalendarStatus;
  createdAt: string;
  updatedAt: string;
}

// ── Contenido ────────────────────────────────────────────────
export interface VideoScene {
  scene: string;
  onScreenText: string;
  voiceover: string;
}

export interface VideoScript {
  concept: string;
  durationSeconds: number;
  scenes: VideoScene[];
  music: string;
  cta: string;
}

export interface PhotoBrief {
  idea: string;
  shotList: string[];
  props: string[];
  composition: string;
}

export interface FeedbackEntry {
  id: ID;
  feedback: string;
  at: string;
}

export interface ContentItem {
  id: ID;
  businessId: ID;
  calendarItemId?: ID;
  title: string;
  caption: string;
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
  visualConcept: string;
  imagePrompt: string;
  imageUrl?: string;
  imageProvider?: AiProvider;
  imageStatus: ImageStatus;
  imageError?: string;
  imageFormat: ImageFormat;
  suggestedLayout: string;
  designTextOverlay: string;
  assetNotes: string;
  videoScript?: VideoScript;
  photoBrief?: PhotoBrief;
  channel: Channel;
  format: ContentFormat;
  objective: string;
  contentPillar: string;
  status: ContentStatus;
  publishStatus: PublishStatus;
  feedbackHistory: FeedbackEntry[];
  createdAt: string;
  updatedAt: string;
}

// ── Ads ──────────────────────────────────────────────────────
export type AdPlatform = "meta" | "google";

export interface MetaAdsStrategy {
  campaignObjective: string;
  funnelStage: string;
  audiences: string[];
  interests: string[];
  adAngles: string[];
  copyVariants: string[];
  headlines: string[];
  ctas: string[];
  creativeSuggestions: string[];
  budgetRecommendation: string;
  destination: string;
}

export interface GoogleAdsStrategy {
  campaignType: string;
  searchIntent: string;
  keywords: string[];
  negativeKeywords: string[];
  copyVariants: string[];
  landingSuggestion: string;
  budgetRecommendation: string;
}

export interface AdStrategy {
  id: ID;
  businessId: ID;
  platform: AdPlatform;
  meta?: MetaAdsStrategy;
  google?: GoogleAdsStrategy;
  createdAt: string;
}

// ── Resultado de IA estándar ─────────────────────────────────
export interface AiMeta {
  provider: AiProvider;
  warning?: string;
}

// ── Extracción de info desde la web del negocio ──────────────
export interface ExtractedProduct {
  type: ProductServiceType;
  name: string;
  shortDescription?: string;
}

export interface ExtractedBusinessInfo {
  name?: string;
  industry?: string;
  subcategory?: string;
  shortDescription?: string;
  fullDescription?: string;
  products?: ExtractedProduct[];
  socialChannels?: string[];
  tone?: string;
  country?: string;
  city?: string;
  competitiveAdvantages?: string[];
}

// ── Estados de campo (origen / confianza) ────────────────────
export type FieldStatusKind = "found" | "suggested" | "review" | "missing" | "user";
export type Confidence = "high" | "medium" | "low";

export interface FieldStatus {
  status: FieldStatusKind;
  confidence?: Confidence;
  source?: string;
}

// ── Brand Kit (identidad visual) ─────────────────────────────
export type AssetOrigin = "detected" | "inferred" | "user" | "uploaded";

export interface BrandColor {
  name: string;
  hex: string;
  role: "primary" | "secondary" | "accent" | "background" | "text" | "other";
  source: "detected" | "inferred" | "user";
  confidence: Confidence;
}

export interface BrandFont {
  family: string;
  source: "detected" | "inferred" | "user";
  confidence: Confidence;
}

export interface BrandLogo {
  id: string;
  type: "primary" | "horizontal" | "vertical" | "icon" | "light" | "dark" | "favicon" | "other";
  url?: string;
  dataUrl?: string;
  source: "detected" | "uploaded";
  selected: boolean;
}

export interface BrandKit {
  colors: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    text?: string;
    palette: BrandColor[];
  };
  typography: {
    heading?: BrandFont;
    body?: BrandFont;
    button?: BrandFont;
  };
  logos: BrandLogo[];
  visualStyle: {
    mood: string[];
    shapes?: string;
    buttonStyle?: string;
    imageStyle?: string;
    designNotes?: string;
  };
  voiceTone: {
    toneTags: string[];
    formality?: "informal" | "neutral" | "formal";
    commonWords?: string[];
    messagingNotes?: string;
  };
  brandKeywords?: string[];
  avoidList?: string[];
}

// ── Business Intelligence Snapshot ───────────────────────────
export interface SocialLink {
  platform: string;
  url: string;
  source: "detected" | "user";
  confidence: Confidence;
}

export interface BusinessIntelligence {
  socialLinks: SocialLink[];
  contactInfo: {
    whatsapp?: string;
    email?: string;
    phone?: string;
    address?: string;
    openingHours?: string;
    deliveryZones?: string[];
  };
  conversionPaths: {
    hasEcommerce?: boolean;
    hasWhatsappSales?: boolean;
    hasReservations?: boolean;
    hasPhysicalStore?: boolean;
    hasContactForm?: boolean;
  };
  primaryConversion?: {
    type: string;
    source: "detected" | "suggested" | "user";
    confidence: Confidence;
  };
  valuePropositions: {
    text: string;
    source: "detected" | "suggested" | "user";
    confidence: Confidence;
  }[];
  recommendedGoal?: {
    goal: string;
    reason: string;
    source: "suggested" | "user";
    confidence: Confidence;
  };
  analysisConfidence?: number;
}

// ── Resultado del análisis de web ────────────────────────────
export interface WebsiteFoundFields {
  name?: string;
  websiteUrl?: string;
  industry?: string;
  subcategory?: string;
  businessType?: string;
  businessModel?: string;
  country?: string;
  state?: string;
  city?: string;
  shortDescription?: string;
  fullDescription?: string;
  values?: string[];
  competitiveAdvantages?: string[];
  marketingChannels?: string[];
  marketingActivities?: string[];
  seasonalityTags?: string[];
  specialDates?: string[];
  productsServices?: {
    name: string;
    type: ProductServiceType;
    category?: string;
    shortDescription?: string;
    price?: number;
    currency?: string;
    source?: string;
    confidence?: Confidence;
    shouldReview?: boolean;
    isTopSeller?: boolean;
  }[];
  audience?: Partial<Audience>;
  goals?: Partial<Goals>;
  brandKit?: BrandKit;
  businessIntelligence?: BusinessIntelligence;
  toneOfVoice?: string;
}

export interface WebsiteAnalysis {
  confidence: number;
  summary: {
    whatEvaUnderstood: string;
    completedFieldsCount: number;
    missingFieldsCount: number;
    reviewFieldsCount: number;
  };
  foundFields: WebsiteFoundFields;
  fieldStatuses: Record<string, FieldStatus>;
  missingFields: string[];
  lowConfidenceFields: string[];
  notes: string[];
  // Indica si se usó IA real o extracción básica
  mode: "ai" | "basic";
}

// Sugerencia generada por Eva para un producto/servicio
export interface ProductDescriptionSuggestion {
  shortDescription: string;
  longDescription: string;
  features: string[];
  keywords: string[];
}
