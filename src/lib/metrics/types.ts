// ─────────────────────────────────────────────────────────────
// Tipos normalizados de métricas multi-plataforma (Instagram / Facebook /
// LinkedIn). Cada adapter de plataforma devuelve un PlatformMetrics con la
// MISMA forma, para que la UI y el agregador no sepan de las diferencias de
// cada API. Preparado para sumar LinkedIn sin tocar la UI.
// ─────────────────────────────────────────────────────────────

export type PlatformId = "instagram" | "facebook" | "linkedin";

/**
 * Estado de una plataforma en la respuesta:
 * - ok: hay datos (aunque sean ceros legítimos).
 * - not_connected: el negocio no conectó esa red (no se muestra la sección).
 * - permission_error: el token no tiene el permiso (ej. read_insights pendiente
 *   de aprobación en Meta) → CTA "reconectá tus redes".
 * - error: fallo genérico (se muestra el detalle técnico colapsable).
 * - coming_soon: integración registrada pero todavía sin métricas (LinkedIn).
 */
export type PlatformStatus =
  | "ok"
  | "not_connected"
  | "permission_error"
  | "error"
  | "coming_soon";

/** Métricas a nivel cuenta/página. Todas opcionales: cada API expone distintas. */
export type AccountMetrics = {
  followers?: number;
  views?: number;
  reach?: number;
  interactions?: number;
  profileViews?: number;
  postsCount?: number;
};

/** Métricas a nivel publicación. */
export type PostMetrics = {
  views?: number;
  reach?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
};

export type PlatformPost = {
  id: string;
  permalink?: string;
  publishedAt: string;
  caption?: string;
  type?: string; // FEED / REELS / STORY / IMAGE / VIDEO…
  /** true si la pieza se publicó desde LOCA (tenemos su id guardado). */
  publishedFromLoca: boolean;
  metrics: PostMetrics;
};

export type MetricsPeriod = "7d" | "30d";

export type PlatformMetrics = {
  platform: PlatformId;
  status: PlatformStatus;
  /** Detalle técnico del fallo (solo si status es error/permission_error). */
  error?: string;
  /** Nombre de la cuenta/página, para mostrar en la sección. */
  accountName?: string;
  period: { from: string; to: string };
  account: AccountMetrics;
  posts: PlatformPost[];
};

/**
 * Resumen general: suma SOLO métricas semánticamente compatibles entre las
 * plataformas conectadas y con status ok. Deja explícito qué plataformas incluye.
 */
export type MetricsSummary = {
  followers: number;
  views: number;
  interactions: number;
  postsCount: number;
  includedPlatforms: PlatformId[];
};

export type MetricsResponse = {
  period: { from: string; to: string; days: number };
  platforms: PlatformMetrics[];
  summary: MetricsSummary;
};
