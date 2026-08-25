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

/** GET /{media-id}/insights — métricas de una publicación de Instagram. */
export async function fetchIgMediaInsights(
  mediaId: string,
  accessToken: string
): Promise<Record<string, number>> {
  const json = await igGet<InsightsResponse>(`/${mediaId}/insights`, accessToken, {
    metric: "reach,likes,comments,saved,shares,views",
  });
  return flatten(json.data);
}
