// ─────────────────────────────────────────────────────────────
// Métricas reales de Meta: cuenta de IG, media individual y página FB.
// Devuelven shapes simples para que la app los mapee a sus tipos.
// ─────────────────────────────────────────────────────────────
import { graphGet } from "./graph";

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
  pageAccessToken: string
): Promise<Record<string, number>> {
  const json = await graphGet<InsightsResponse>(`/${igUserId}/insights`, pageAccessToken, {
    metric: "reach,profile_views,accounts_engaged,total_interactions",
    period: "day",
    metric_type: "total_value",
  });
  return flatten(json.data);
}

/** GET /{media-id}/insights — métricas de una publicación de Instagram. */
export async function fetchIgMediaInsights(
  mediaId: string,
  pageAccessToken: string
): Promise<Record<string, number>> {
  const json = await graphGet<InsightsResponse>(`/${mediaId}/insights`, pageAccessToken, {
    metric: "reach,likes,comments,saved,shares,views",
  });
  return flatten(json.data);
}

/** GET /{page-id}/insights — métricas de la página de Facebook. */
export async function fetchPageInsights(
  pageId: string,
  pageAccessToken: string
): Promise<Record<string, number>> {
  const json = await graphGet<InsightsResponse>(`/${pageId}/insights`, pageAccessToken, {
    metric: "page_impressions,page_post_engagements,page_fans",
    period: "day",
  });
  return flatten(json.data);
}
