// ─────────────────────────────────────────────────────────────
// Adapter de métricas de Facebook (página). Las métricas del NEGOCIO salen del
// nivel PÁGINA (independiente de LOCA). Las métricas por post solo se pueden
// traer para posts publicados desde LOCA (tenemos su post_id), leyéndolos por ID.
//
// ⚠️ NO listar /feed, /posts ni /published_posts: exigen pages_read_user_content
// (#10), permiso que la app no pide. NO usar likes.summary/comments.summary en
// posts por el mismo motivo.
//
// ⚠️ Insights de página y de post requieren read_insights, PENDIENTE de
// aprobación en App Review: para usuarios sin rol en la app va a devolver error
// de permiso hasta que Meta lo apruebe (se refleja como status permission_error).
//
// Nombres de métrica verificados en Graph API Explorer (page token, 2026-09-24):
//   página: page_media_view, page_follows, page_post_engagements (period=day)
//   post:   post_media_view (reemplazo de post_impressions),
//           post_reactions_by_type_total (best-effort)
// ─────────────────────────────────────────────────────────────
import { graphGet } from "@/lib/meta/graph";
import { decryptToken } from "@/lib/connections/crypto";
import type { ConnectionRow } from "@/lib/connections/repository";
import type { PlatformMetrics, PlatformPost, PostMetrics } from "../types";
import {
  basePlatform,
  deriveStatus,
  latestDaily,
  sumDaily,
  type MetricsWindow,
} from "./shared";

export type LocaFbPost = { id: string; caption?: string; publishedAt?: string };

const MAX_POSTS = 12;

export async function fetchFacebookMetrics(
  conn: ConnectionRow | null,
  window: MetricsWindow,
  locaFbPosts: LocaFbPost[]
): Promise<PlatformMetrics> {
  if (!conn || conn.status !== "active" || !conn.page_access_token_enc || !conn.account_id) {
    return basePlatform("facebook", "not_connected", window);
  }

  const token = decryptToken(conn.page_access_token_enc);
  const pageId = conn.account_id;
  const errors: string[] = [];
  const account: PlatformMetrics["account"] = {};

  // 1. Insights de página (requiere read_insights).
  try {
    const ins = await graphGet<{ data: any[] }>(`/${pageId}/insights`, token, {
      metric: "page_media_view,page_follows,page_post_engagements",
      period: "day",
      since: window.from,
      until: window.to,
    });
    const data = ins.data || [];
    account.views = sumDaily(data, "page_media_view") ?? account.views;
    account.interactions = sumDaily(data, "page_post_engagements") ?? account.interactions;
    account.followers = latestDaily(data, "page_follows") ?? account.followers;
  } catch (e) {
    errors.push(msgOf(e));
  }

  // 2. Seguidores como total puntual (campo), si el insight no lo trajo.
  if (account.followers == null) {
    try {
      const p = await graphGet<{ followers_count?: number; fan_count?: number }>(
        `/${pageId}`,
        token,
        { fields: "followers_count,fan_count" }
      );
      account.followers = p.followers_count ?? p.fan_count ?? account.followers;
    } catch {
      /* best-effort */
    }
  }

  // 3. Posts publicados desde LOCA (por ID; nunca listar el feed).
  const posts: PlatformPost[] = [];
  for (const ref of locaFbPosts.slice(0, MAX_POSTS)) {
    try {
      const meta = await graphGet<{
        permalink_url?: string;
        created_time?: string;
        message?: string;
      }>(`/${ref.id}`, token, { fields: "permalink_url,created_time,message" });

      const metrics: PostMetrics = {};
      try {
        const pi = await graphGet<{ data: any[] }>(`/${ref.id}/insights`, token, {
          metric: "post_media_view",
        });
        metrics.views = sumDaily(pi.data || [], "post_media_view");
        metrics.reach = metrics.views;
      } catch {
        /* post_media_view puede no estar disponible: seguimos */
      }
      try {
        const pr = await graphGet<{ data: any[] }>(`/${ref.id}/insights`, token, {
          metric: "post_reactions_by_type_total",
        });
        const m = (pr.data || []).find((x) => x.name === "post_reactions_by_type_total");
        const v = m?.total_value?.value ?? m?.values?.[m.values.length - 1]?.value;
        if (v && typeof v === "object") {
          metrics.likes = Object.values(v).reduce(
            (a: number, b) => a + (typeof b === "number" ? b : 0),
            0
          );
        }
      } catch {
        /* reacciones best-effort */
      }

      posts.push({
        id: ref.id,
        permalink: meta.permalink_url,
        publishedAt: meta.created_time || ref.publishedAt || "",
        caption: meta.message || ref.caption,
        type: "FEED",
        publishedFromLoca: true,
        metrics,
      });
    } catch (e) {
      // Un post que falla (permiso/eliminado) no corta el resto.
      errors.push(msgOf(e));
    }
  }

  const gotData = Object.keys(account).length > 0 || posts.length > 0;
  return basePlatform("facebook", deriveStatus(gotData, errors), window, {
    accountName: conn.account_name || undefined,
    error: errors.length ? errors.join(" · ") : undefined,
    account,
    posts,
  });
}

function msgOf(e: unknown): string {
  return e instanceof Error ? e.message : "Error de Facebook";
}
