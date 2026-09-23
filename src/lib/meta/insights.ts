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

/**
 * Métricas de una publicación de Instagram.
 * Likes y comentarios se leen del objeto del media (`like_count`,
 * `comments_count`) porque son confiables para cualquier tipo de media. El
 * resto (alcance, guardados, compartidos, reproducciones) va a /insights en
 * best-effort: las métricas válidas cambian según el tipo de media (imagen,
 * carrusel, reel), y si una no aplica Meta devuelve error #100 y tira abajo
 * TODA la llamada. Así, si insights falla, igual devolvemos likes/comentarios.
 */
export async function fetchIgMediaInsights(
  mediaId: string,
  pageAccessToken: string
): Promise<Record<string, number>> {
  const obj = await graphGet<{ like_count?: number; comments_count?: number }>(
    `/${mediaId}`,
    pageAccessToken,
    { fields: "like_count,comments_count" }
  );

  let ins: Record<string, number> = {};
  try {
    const json = await graphGet<InsightsResponse>(`/${mediaId}/insights`, pageAccessToken, {
      metric: "reach,saved,shares,views",
    });
    ins = flatten(json.data);
  } catch {
    /* las métricas de insights varían por tipo de media: seguimos con los conteos del objeto */
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

/**
 * GET /{page-id}/insights — métricas de la página de Facebook.
 * Meta deprecó `page_impressions` y `page_fans` (nov-2025): la API devuelve
 * error #100 y tira abajo toda la respuesta. Reemplazos vigentes verificados en
 * el Graph API Explorer: `page_media_view` (impresiones) y `page_follows`
 * (seguidores). `page_post_engagements` sigue siendo válida.
 */
export async function fetchPageInsights(
  pageId: string,
  pageAccessToken: string
): Promise<Record<string, number>> {
  const json = await graphGet<InsightsResponse>(`/${pageId}/insights`, pageAccessToken, {
    metric: "page_media_view,page_post_engagements,page_follows",
    period: "day",
  });
  return flatten(json.data);
}

/**
 * Métricas de una publicación de una PÁGINA de Facebook, leyendo el post propio
 * por ID (el post_id que guardamos al publicar). Se lee TODO desde
 * /{post-id}/insights, que funciona con `pages_read_engagement`.
 *
 * IMPORTANTE: no leer likes/comentarios del objeto del post con `.summary(true)`
 * ni listar el feed/posts de la página: eso cuenta contenido de usuarios y exige
 * `pages_read_user_content` (error #10), permiso que la app no pide ni va a pedir.
 *
 * `post_impressions` está deprecado → `post_media_view` (alcance/impresiones).
 * Las reacciones van en una llamada aparte, best-effort: si ese nombre de
 * métrica no está disponible, igual devolvemos el alcance sin romper todo.
 * Comentarios y compartidos quedan en 0 (no son accesibles sin el permiso de
 * contenido de usuarios).
 */
export async function fetchFbPostInsights(
  postId: string,
  pageAccessToken: string
): Promise<Record<string, number>> {
  const impr = await graphGet<InsightsResponse>(`/${postId}/insights`, pageAccessToken, {
    metric: "post_media_view",
  });
  const reach = flatten(impr.data).post_media_view ?? 0;

  let likes = 0;
  try {
    const react = await graphGet<InsightsResponse>(`/${postId}/insights`, pageAccessToken, {
      metric: "post_reactions_by_type_total",
    });
    for (const m of react.data) {
      const v = m.total_value?.value ?? m.values?.[m.values.length - 1]?.value;
      if (v && typeof v === "object") {
        likes = Object.values(v).reduce((a, b) => a + (typeof b === "number" ? b : 0), 0);
      }
    }
  } catch {
    /* la métrica de reacciones puede cambiar de nombre: seguimos con el alcance */
  }

  // Shape alineado con performanceFromMedia (reach/views/likes/comments/shares/saved).
  return { reach, views: reach, likes, comments: 0, shares: 0, saved: 0 };
}
