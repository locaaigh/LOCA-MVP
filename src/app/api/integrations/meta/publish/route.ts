import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/supabase/server";
import { resolveContent, jsonError } from "@/lib/repository/resolve";
import { getConnection, type ConnectionRow } from "@/lib/connections/repository";
import { decryptToken } from "@/lib/connections/crypto";
import { publishToInstagram, publishToFacebook } from "@/lib/meta/publish";
import { publishToInstagram as publishToInstagramDirect } from "@/lib/instagram/publish";
import { publishToLinkedIn } from "@/lib/linkedin/publish";
import { logEvent } from "@/lib/events";
import type { Business, Channel, ContentItem, ContentPublishRecord } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type PublishBody = {
  businessId: string;
  contentId: string;
  /** Si se pasa, publica SOLO en esa plataforma (reintento puntual). Si no, se
   *  publica en todas las plataformas destino de la pieza (crosspost). */
  platform?: "instagram" | "facebook";
};

/**
 * Plataformas destino de una pieza (crosspost): el canal principal + las
 * distributionPlatforms. Si no hay explícitas, infiere Instagram → +Facebook
 * cuando el negocio también usa Facebook. Espeja contentPlatforms() del cliente
 * para que "lo que se ve" sea "lo que se publica".
 */
function targetPlatforms(content: ContentItem, business: Business): Channel[] {
  const out: Channel[] = [content.channel];
  const add = (p: Channel) => {
    if (!out.includes(p)) out.push(p);
  };
  (content.distributionPlatforms || []).forEach(add);
  if (!content.distributionPlatforms?.length) {
    const usesFacebook = (business.marketingChannels || []).some((c) => /face/i.test(c));
    if (/insta/i.test(content.channel) && usesFacebook) add("Facebook");
  }
  return out;
}

function requireImage(content: ContentItem, red: string): string {
  if (!content.imageUrl || !content.imageUrl.startsWith("http")) {
    throw new Error(`La pieza necesita una imagen generada (URL pública) para publicarse en ${red}.`);
  }
  return content.imageUrl;
}

type OneResult = { mediaId: string; permalink?: string };

/** Publica la pieza en UNA plataforma. Lanza Error si no se puede. */
async function publishOnePlatform(
  platform: Channel,
  content: ContentItem,
  caption: string,
  conns: { fb: ConnectionRow | null; ig: ConnectionRow | null; li: ConnectionRow | null }
): Promise<OneResult> {
  const usingFacebook = !!(conns.fb && conns.fb.status === "active" && conns.fb.page_access_token_enc);

  if (platform === "Instagram") {
    // Preferimos la cuenta de IG vinculada a la página (conexión de Meta).
    if (usingFacebook && conns.fb!.ig_user_id) {
      const pageToken = decryptToken(conns.fb!.page_access_token_enc!);
      return publishToInstagram(conns.fb!.ig_user_id, pageToken, {
        imageUrl: requireImage(content, "Instagram"),
        caption,
      });
    }
    // Fallback: conexión de Instagram Login (negocios sin página de FB).
    if (conns.ig && conns.ig.status === "active" && conns.ig.account_id) {
      const igToken = decryptToken(conns.ig.user_access_token_enc);
      return publishToInstagramDirect(conns.ig.account_id, igToken, {
        imageUrl: requireImage(content, "Instagram"),
        caption,
      });
    }
    throw new Error("No hay una cuenta de Instagram conectada. Conectala en Configuración.");
  }

  if (platform === "Facebook") {
    if (!usingFacebook || !conns.fb!.account_id) {
      throw new Error("No hay una página de Facebook conectada. Conectá Facebook en Configuración.");
    }
    const pageToken = decryptToken(conns.fb!.page_access_token_enc!);
    return publishToFacebook(conns.fb!.account_id, pageToken, {
      message: caption,
      imageUrl: content.imageUrl,
    });
  }

  if (platform === "LinkedIn") {
    if (!conns.li || conns.li.status !== "active" || !conns.li.account_id) {
      throw new Error("No hay una conexión de LinkedIn activa con una página. Conectá LinkedIn en Configuración.");
    }
    const liToken = decryptToken(conns.li.user_access_token_enc);
    return publishToLinkedIn(`urn:li:organization:${conns.li.account_id}`, liToken, {
      imageUrl: requireImage(content, "LinkedIn"),
      caption,
    });
  }

  // TikTok u otras: sin integración de publicación todavía.
  throw new Error(`La publicación automática en ${platform} todavía no está disponible.`);
}

/**
 * Publica una pieza en TODAS sus plataformas destino (crosspost) y registra el
 * resultado de cada una. Ver PLAN-v2 item 11 / A.
 */
export async function POST(req: NextRequest) {
  let businessId = "";
  let contentId = "";
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Necesitás una cuenta para publicar" }, { status: 401 });
    }

    const body = (await req.json()) as PublishBody;
    businessId = body.businessId;
    contentId = body.contentId;
    if (!businessId || !contentId) {
      return NextResponse.json({ error: "Faltan businessId o contentId" }, { status: 400 });
    }

    const resolved = await resolveContent(req, businessId, contentId);
    if ("error" in resolved) return jsonError(resolved);
    const { ctx, business, content } = resolved;

    // Caption final: solo el caption (sin hashtags — item 19).
    const caption = content.caption;

    // Conexiones del negocio (una lectura por proveedor).
    const [fb, ig, li] = await Promise.all([
      getConnection(userId, businessId, "facebook"),
      getConnection(userId, businessId, "instagram"),
      getConnection(userId, businessId, "linkedin"),
    ]);
    const conns = { fb, ig, li };

    // Plataformas a publicar: la explícita del body (reintento puntual) o todas
    // las de la pieza (crosspost).
    const targets: Channel[] = body.platform
      ? [body.platform === "facebook" ? "Facebook" : "Instagram"]
      : targetPlatforms(content, business);

    // Publicar en cada plataforma, sin que un fallo corte a las demás.
    const nowIso = new Date().toISOString();
    const results: ContentPublishRecord[] = [];
    for (const platform of targets) {
      try {
        const r = await publishOnePlatform(platform, content, caption, conns);
        results.push({ platform, status: "published", mediaId: r.mediaId, url: r.permalink, at: nowIso });
        await logEvent({
          userId,
          businessId,
          name: "content_published",
          props: { contentId, platform, mediaId: r.mediaId },
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Error publicando";
        results.push({ platform, status: "error", error: msg, at: nowIso });
        await logEvent({
          userId,
          businessId,
          name: "content_publish_failed",
          props: { contentId, platform, error: msg },
        });
      }
    }

    const ok = results.filter((r) => r.status === "published");
    const failed = results.filter((r) => r.status === "error");
    const primary = ok[0]; // plataforma principal = primera exitosa

    // Persistir el resultado en la pieza: detalle por plataforma + campos
    // "singular" de la principal para compatibilidad con lo existente.
    await ctx.repo.upsertContent(ctx.userId, {
      ...content,
      status: ok.length > 0 ? "published" : content.status,
      publishedAt: primary ? nowIso : content.publishedAt,
      publishAttemptedAt: nowIso,
      publishedPlatform: primary ? primary.platform : content.publishedPlatform,
      publishedMediaId: primary ? primary.mediaId : content.publishedMediaId,
      publishedUrl: primary ? primary.url : content.publishedUrl,
      publishError: failed.length > 0 ? failed.map((f) => `${f.platform}: ${f.error}`).join(" · ") : undefined,
      publishResults: results,
      updatedAt: nowIso,
    });

    // Si NO se pudo publicar en ninguna plataforma, es un error.
    if (ok.length === 0) {
      return NextResponse.json(
        { error: failed.map((f) => `${f.platform}: ${f.error}`).join(" · ") || "No se pudo publicar", results },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      results,
      published: ok.map((r) => r.platform),
      failed: failed.map((f) => ({ platform: f.platform, error: f.error })),
      // Compatibilidad con el shape previo (plataforma principal).
      platform: primary.platform,
      mediaId: primary.mediaId,
      permalink: primary.url,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error publicando";
    console.error("[meta/publish]", msg);
    await logEvent({
      userId: await getSessionUserId(),
      businessId: businessId || null,
      name: "content_publish_failed",
      props: { contentId: contentId || null, error: msg },
    });
    try {
      if (businessId && contentId) {
        const resolved = await resolveContent(req, businessId, contentId);
        if (!("error" in resolved)) {
          await resolved.ctx.repo.upsertContent(resolved.ctx.userId, {
            ...resolved.content,
            publishError: msg,
            publishAttemptedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    } catch {
      /* no bloquear la respuesta de error por un fallo al registrar */
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
