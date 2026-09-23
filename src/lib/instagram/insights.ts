// ─────────────────────────────────────────────────────────────
// Métricas reales de Instagram vía graph.instagram.com (Instagram Login):
// cuenta y media individual. Espeja las de src/lib/meta/insights.ts pero
// contra el host de Instagram y con el token del usuario.
// ─────────────────────────────────────────────────────────────
import { igGet } from "./graph";

type InsightValue = { value?: number | Record<string, number> };
type Insight = {
  name: string;
  period?: string;
  values?: InsightValue[];
  total_value?: { value?: number };
};
type InsightsResponse = { data: Insight[] };

function flatten(data: Insight[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of data) {
    const total = m.total_value?.value;
    const last = m.values?.[m.values.length - 1]?.value;
    const v = total ?? (typeof last === "number" ? last : undefined);
    if (typeof v === "number") out[m.name] = v;
  }
  return out;
}

/** GET /{ig-id}/insights — métricas de la cuenta de Instagram (últimos días). */
export async function fetchIgAccountInsights(
  igUserId: string,
  accessToken: string
): Promise<Record<string, number>> {
  const json = await igGet<InsightsResponse>(`/${igUserId}/insights`, accessToken, {
    metric: "reach,profile_views,accounts_engaged,total_interactions",
    period: "day",
    metric_type: "total_value",
  });
  return flatten(json.data);
}

/**
 * Métricas de una publicación de Instagram (Instagram Login).
 * Likes y comentarios se leen del objeto del media (confiables para cualquier
 * tipo); el resto va a /insights en best-effort, porque las métricas válidas
 * dependen del tipo de media y una inválida tira abajo toda la llamada (#100).
 */
export async function fetchIgMediaInsights(
  mediaId: string,
  accessToken: string
): Promise<Record<string, number>> {
  const obj = await igGet<{ like_count?: number; comments_count?: number }>(
    `/${mediaId}`,
    accessToken,
    { fields: "like_count,comments_count" }
  );

  let ins: Record<string, number> = {};
  try {
    const json = await igGet<InsightsResponse>(`/${mediaId}/insights`, accessToken, {
      metric: "reach,saved,shares,views",
    });
    ins = flatten(json.data);
  } catch {
    /* métricas de insights variables por tipo de media: seguimos con conteos del objeto */
  }

  return {
    reach: ins.reach ?? 0,
    views: ins.views ?? 0,
    saved: ins.saved ?? 0,
    shares: ins.shares ?? 0,
    likes: obj.like_count ?? 0,
    comments: obj.comments_count ?? 0,
  };
}
