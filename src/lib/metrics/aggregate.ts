// ─────────────────────────────────────────────────────────────
// Resumen general: suma SOLO métricas semánticamente compatibles entre las
// plataformas conectadas y con datos (status ok). Deja explícito qué
// plataformas incluye. NO se suma "reach" entre redes (no hay equivalente
// válido entre IG y FB hoy).
//
//   Seguidores   = IG followers_count + FB page_follows
//   Vistas       = IG views           + FB page_media_view
//   Interacciones= IG total_interactions + FB page_post_engagements
//   Publicaciones= conteo de posts del período por plataforma
// ─────────────────────────────────────────────────────────────
import type { MetricsSummary, PlatformId, PlatformMetrics } from "./types";

export function aggregate(platforms: PlatformMetrics[]): MetricsSummary {
  const included: PlatformId[] = [];
  let followers = 0;
  let views = 0;
  let interactions = 0;
  let postsCount = 0;

  for (const p of platforms) {
    if (p.status !== "ok") continue;
    included.push(p.platform);
    followers += p.account.followers ?? 0;
    views += p.account.views ?? 0;
    interactions += p.account.interactions ?? 0;
    // Publicaciones del período: si la API dio postsCount de cuenta, se usa; si
    // no, se cuenta la lista de posts traída.
    postsCount += p.account.postsCount ?? p.posts.length;
  }

  return { followers, views, interactions, postsCount, includedPlatforms: included };
}
