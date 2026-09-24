// ─────────────────────────────────────────────────────────────
// Adapter de métricas de Instagram. Cubre las DOS formas de conexión:
// - source "meta":   IG vinculado a una página de FB (graph.facebook.com,
//                    page token, ig_user_id).
// - source "iglogin": Instagram Login (graph.instagram.com, token de usuario,
//                    account_id = ig user id).
// Permiso de insights de IG (instagram_manage_insights / _business_manage_insights)
// APROBADO en App Review → funciona para todos los usuarios.
//
// Nombres de métrica verificados a mano en Graph API Explorer (2026-09-24):
//   cuenta:  reach, views, total_interactions, profile_views (metric_type=total_value, period=day)
//   media:   reach, saved, shares, views  (varían por media_product_type; se toleran por media)
//   campos:  followers_count, media_count, like_count, comments_count
// ─────────────────────────────────────────────────────────────
import { graphGet } from "@/lib/meta/graph";
import { igGet } from "@/lib/instagram/graph";
import { decryptToken } from "@/lib/connections/crypto";
import type { ConnectionRow } from "@/lib/connections/repository";
import type { PlatformMetrics, PlatformPost, PostMetrics } from "../types";
import {
  basePlatform,
  deriveStatus,
  sumDaily,
  type MetricsWindow,
} from "./shared";

type IgGet = (path: string, params?: Record<string, string>) => Promise<any>;

// Cuántos media consultar insights como máximo (rate limits + latencia).
const MAX_MEDIA_INSIGHTS = 12;

type MediaNode = {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
};

async function run(
  get: IgGet,
  igUserId: string,
  window: MetricsWindow,
  locaMediaIds: Set<string>
): Promise<PlatformMetrics> {
  const errors: string[] = [];
  const account: PlatformMetrics["account"] = {};
  let accountName: string | undefined;

  // 1. Datos de cuenta (campos): seguidores, cantidad de posts, usuario.
  try {
    const prof = await get(`/${igUserId}`, {
      fields: "username,followers_count,media_count",
    });
    accountName = prof.username ? `@${prof.username}` : undefined;
    if (typeof prof.followers_count === "number") account.followers = prof.followers_count;
    if (typeof prof.media_count === "number") account.postsCount = prof.media_count;
  } catch (e) {
    errors.push(msgOf(e));
  }

  // 2. Insights de cuenta (best-effort; una métrica inválida no debe tirar todo).
  try {
    const ins = await get(`/${igUserId}/insights`, {
      metric: "reach,views,total_interactions,profile_views",
      metric_type: "total_value",
      period: "day",
      since: window.from,
      until: window.to,
    });
    const data = ins.data || [];
    account.reach = sumDaily(data, "reach") ?? account.reach;
    account.views = sumDaily(data, "views") ?? account.views;
    account.interactions = sumDaily(data, "total_interactions") ?? account.interactions;
    account.profileViews = sumDaily(data, "profile_views") ?? account.profileViews;
  } catch (e) {
    errors.push(msgOf(e));
  }

  // 3. Posts del período (permitido con instagram_basic sobre la cuenta propia).
  const posts: PlatformPost[] = [];
  try {
    const media = await get(`/${igUserId}/media`, {
      fields:
        "id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count",
      limit: "25",
    });
    const nodes: MediaNode[] = (media.data || []).filter((m: MediaNode) =>
      inWindow(m.timestamp, window)
    );

    let consulted = 0;
    for (const m of nodes) {
      const metrics: PostMetrics = {
        likes: m.like_count,
        comments: m.comments_count,
      };
      // Insights por media, tolerando errores por tipo de media (FEED/REELS/STORY).
      if (consulted < MAX_MEDIA_INSIGHTS) {
        consulted++;
        try {
          const mi = await get(`/${m.id}/insights`, { metric: "reach,saved,shares,views" });
          const d = mi.data || [];
          metrics.reach = sumDaily(d, "reach");
          metrics.saves = sumDaily(d, "saved");
          metrics.shares = sumDaily(d, "shares");
          metrics.views = sumDaily(d, "views");
        } catch {
          /* este media no expone esas métricas: seguimos con likes/comentarios */
        }
      }
      posts.push({
        id: m.id,
        permalink: m.permalink,
        publishedAt: m.timestamp || "",
        caption: m.caption,
        type: m.media_product_type || m.media_type,
        publishedFromLoca: locaMediaIds.has(m.id),
        metrics,
      });
    }
  } catch (e) {
    errors.push(msgOf(e));
  }

  const gotData =
    Object.keys(account).length > 0 || posts.length > 0;
  return basePlatform("instagram", deriveStatus(gotData, errors), window, {
    accountName,
    error: errors.length ? errors.join(" · ") : undefined,
    account,
    posts,
  });
}

/**
 * Métricas de Instagram para el negocio. Elige la fuente según la conexión:
 * prioriza la de Meta (IG vinculado a página) y cae a Instagram Login.
 */
export async function fetchInstagramMetrics(
  conns: { facebook: ConnectionRow | null; instagram: ConnectionRow | null },
  window: MetricsWindow,
  locaMediaIds: Set<string>
): Promise<PlatformMetrics> {
  const fb = conns.facebook;
  // IG vía Meta (página con cuenta de IG vinculada).
  if (fb && fb.status === "active" && fb.page_access_token_enc && fb.ig_user_id) {
    const token = decryptToken(fb.page_access_token_enc);
    const get: IgGet = (path, params) => graphGet<any>(path, token, params);
    return run(get, fb.ig_user_id, window, locaMediaIds);
  }
  // IG vía Instagram Login (graph.instagram.com).
  const ig = conns.instagram;
  if (ig && ig.status === "active" && ig.account_id) {
    const token = decryptToken(ig.user_access_token_enc);
    const get: IgGet = (path, params) => igGet<any>(path, token, params);
    return run(get, ig.account_id, window, locaMediaIds);
  }
  return basePlatform("instagram", "not_connected", window);
}

function msgOf(e: unknown): string {
  return e instanceof Error ? e.message : "Error de Instagram";
}

function inWindow(ts: string | undefined, window: MetricsWindow): boolean {
  if (!ts) return false;
  const t = new Date(ts).getTime();
  return t >= new Date(window.from).getTime() && t <= new Date(window.to).getTime() + 86400000;
}
