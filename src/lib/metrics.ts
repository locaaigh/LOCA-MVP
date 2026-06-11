// ─────────────────────────────────────────────────────────────
// Métricas de redes. HOY: mock/demo. Preparado para recibir data real
// desde APIs de redes en el futuro (mismo shape ContentPerformance).
// ─────────────────────────────────────────────────────────────
import type {
  Business,
  ChannelMetrics,
  ContentItem,
  ContentPerformance,
  MetricsSnapshot,
  PerformanceInsight,
} from "./types";
import { FORMAT_LABELS } from "./constants";

const DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

// Pseudo-aleatorio determinístico (sin Math.random) para que el demo sea estable.
function seeded(n: number, min: number, max: number): number {
  const x = Math.abs(Math.sin(n * 12.9898) * 43758.5453);
  const frac = x - Math.floor(x);
  return Math.round(min + frac * (max - min));
}

// Genera performance mock a partir de los contenidos del negocio (o genéricos).
export function mockPerformance(business: Business, contents: ContentItem[]): ContentPerformance[] {
  const base = contents.length
    ? contents
    : ([
        { id: "m1", title: "Reel educativo", channel: "Instagram", format: "reel" },
        { id: "m2", title: "Post de producto", channel: "Instagram", format: "post_estatico" },
        { id: "m3", title: "Carrusel de tips", channel: "Instagram", format: "carrusel" },
        { id: "m4", title: "Historia detrás de escena", channel: "Instagram", format: "story" },
        { id: "m5", title: "Reel de venta", channel: "TikTok", format: "reel" },
      ] as any[]);

  return base.slice(0, 16).map((c: any, i: number) => {
    const isReel = c.format === "reel";
    const isEducational = /educativ|tip|gu[ií]a|aprend/i.test(c.title || "");
    const reach = seeded(i + 1, 400, 4200) * (isReel ? 1.6 : 1);
    const impressions = Math.round(reach * (1.2 + seeded(i + 7, 0, 60) / 100));
    const likes = seeded(i + 2, 10, 220) * (isEducational ? 1.5 : 1);
    const comments = seeded(i + 3, 0, 40);
    const shares = seeded(i + 4, 0, 35) * (isEducational ? 2 : 1);
    const saves = seeded(i + 5, 0, 60) * (isEducational ? 2.2 : 1);
    const clicks = seeded(i + 6, 0, 90);
    const interactions = Math.round(likes + comments + shares + saves);
    const engagementRate = Math.min(0.18, interactions / Math.max(reach, 1));
    return {
      id: `perf_${c.id || i}`,
      contentId: c.id,
      title: c.title || `Pieza ${i + 1}`,
      channel: c.channel || "Instagram",
      format: c.format || "post_estatico",
      date: new Date(Date.now() - (i + 1) * 86400000 * 2).toISOString(),
      reach: Math.round(reach),
      impressions,
      interactions,
      likes: Math.round(likes),
      comments,
      shares: Math.round(shares),
      saves: Math.round(saves),
      clicks,
      ctr: impressions ? Number((clicks / impressions).toFixed(3)) : 0,
      videoViews: isReel ? Math.round(reach * 1.4) : undefined,
      avgWatchTimeSec: isReel ? seeded(i + 8, 3, 18) : undefined,
      engagementRate: Number(engagementRate.toFixed(3)),
      leads: seeded(i + 9, 0, 12),
    };
  });
}

export function analyzeContentPerformance(
  metrics: ContentPerformance[],
  isDemo = true
): MetricsSnapshot {
  if (!metrics.length) {
    return {
      isDemo,
      totals: { reach: 0, impressions: 0, interactions: 0, engagementRate: 0 },
      byChannel: [],
      topContent: [],
      insights: [],
    };
  }

  const sum = (f: (m: ContentPerformance) => number) => metrics.reduce((a, m) => a + f(m), 0);
  const totals = {
    reach: sum((m) => m.reach),
    impressions: sum((m) => m.impressions),
    interactions: sum((m) => m.interactions),
    engagementRate: metrics.reduce((a, m) => a + m.engagementRate, 0) / metrics.length,
  };

  // Por canal
  const channelMap: Record<string, ContentPerformance[]> = {};
  for (const m of metrics) (channelMap[m.channel] ||= []).push(m);
  const byChannel: ChannelMetrics[] = Object.entries(channelMap).map(([channel, list]) => ({
    channel,
    posts: list.length,
    reach: list.reduce((a, m) => a + m.reach, 0),
    impressions: list.reduce((a, m) => a + m.impressions, 0),
    interactions: list.reduce((a, m) => a + m.interactions, 0),
    engagementRate: list.reduce((a, m) => a + m.engagementRate, 0) / list.length,
  }));

  // Mejores
  const bestChannel = [...byChannel].sort((a, b) => b.engagementRate - a.engagementRate)[0]?.channel;
  const formatAgg: Record<string, { er: number; n: number }> = {};
  for (const m of metrics) {
    const f = formatAgg[m.format] || (formatAgg[m.format] = { er: 0, n: 0 });
    f.er += m.engagementRate;
    f.n++;
  }
  const formatRanked = Object.entries(formatAgg)
    .map(([format, v]) => ({ format, er: v.er / v.n }))
    .sort((a, b) => b.er - a.er);
  const bestFormat = formatRanked[0]?.format;
  const dayAgg: Record<number, { er: number; n: number }> = {};
  for (const m of metrics) {
    const d = new Date(m.date).getDay();
    const v = dayAgg[d] || (dayAgg[d] = { er: 0, n: 0 });
    v.er += m.engagementRate;
    v.n++;
  }
  const bestDayIdx = Object.entries(dayAgg)
    .map(([d, v]) => ({ d: Number(d), er: v.er / v.n }))
    .sort((a, b) => b.er - a.er)[0]?.d;
  const topContent = [...metrics].sort((a, b) => b.engagementRate - a.engagementRate).slice(0, 5);

  // Insights didácticos
  const insights: PerformanceInsight[] = [];
  if (formatRanked.length >= 2) {
    const top = formatRanked[0];
    const low = formatRanked[formatRanked.length - 1];
    const mult = low.er > 0 ? (top.er / low.er).toFixed(1) : "2.0";
    insights.push({
      kind: "win",
      title: `${FORMAT_LABELS[top.format] || top.format} es tu mejor formato`,
      detail: `Tuvo ${mult}x más interacción que ${FORMAT_LABELS[low.format] || low.format}. Eva recomienda sumar más de este formato el próximo mes.`,
    });
  }
  if (bestChannel) {
    insights.push({
      kind: "repeat",
      title: `${bestChannel} es tu canal más fuerte`,
      detail: `Es donde mejor engagement tenés. Conviene priorizarlo y publicar con más frecuencia.`,
    });
  }
  if (bestDayIdx != null) {
    insights.push({
      kind: "recommendation",
      title: `Los ${DAYS[bestDayIdx]} rinden mejor`,
      detail: `Tus publicaciones de ese día tuvieron más interacción. Probá concentrar tus piezas clave ahí.`,
    });
  }
  const lowSaves = metrics.filter((m) => m.saves < 5).length;
  if (lowSaves > metrics.length / 2) {
    insights.push({
      kind: "learning",
      title: "Falta contenido que la gente quiera guardar",
      detail: "Pocos guardados: sumá guías, listas o tips útiles para que tu audiencia los guarde y vuelva.",
    });
  }
  insights.push({
    kind: "avoid",
    title: "Menos venta directa seguida",
    detail: "Los posts de venta directa rinden mejor intercalados con contenido de valor. Evitá publicar varios seguidos.",
  });

  return {
    isDemo,
    totals,
    byChannel,
    bestChannel,
    bestFormat,
    bestDay: bestDayIdx != null ? DAYS[bestDayIdx] : undefined,
    bestContentTitle: topContent[0]?.title,
    topContent,
    insights,
  };
}
