import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/supabase/server";
import { resolveContent, jsonError } from "@/lib/repository/resolve";
import { getConnection } from "@/lib/connections/repository";
import { decryptToken } from "@/lib/connections/crypto";
import { publishToInstagram, publishToFacebook } from "@/lib/meta/publish";
import { publishToInstagram as publishToInstagramDirect } from "@/lib/instagram/publish";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type PublishBody = {
  businessId: string;
  contentId: string;
  /** Si no se pasa, se infiere del canal del contenido. */
  platform?: "instagram" | "facebook";
};

/** Publica una pieza de contenido en Instagram o Facebook con la conexión Meta del negocio. */
export async function POST(req: NextRequest) {
  // Hoisted para poder registrar el error en la pieza dentro del catch.
  let businessId = "";
  let contentId = "";
  try {
    // Publicar requiere cuenta real (los tokens se guardan por usuario de Supabase)
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Necesitás una cuenta para publicar" }, { status: 401 });
    }

    const body = (await req.json()) as PublishBody;
    businessId = body.businessId;
    contentId = body.contentId;
    const platform = body.platform;
    if (!businessId || !contentId) {
      return NextResponse.json({ error: "Faltan businessId o contentId" }, { status: 400 });
    }

    const resolved = await resolveContent(req, businessId, contentId);
    if ("error" in resolved) return jsonError(resolved);
    const { ctx, content } = resolved;

    // Preferimos la conexión de Meta (Facebook): cubre FB + IG con un solo
    // login. Si el negocio no tiene página de Facebook, cae a la conexión de
    // Instagram Login (solo IG). El proveedor elegido decide el cliente.
    const fbConnection = await getConnection(userId, businessId, "facebook");
    const usingFacebook = !!(
      fbConnection &&
      fbConnection.status === "active" &&
      fbConnection.page_access_token_enc
    );

    // Caption final: solo el caption (sin hashtags — item 19)
    const caption = content.caption;

    let result;
    if (usingFacebook) {
      const connection = fbConnection!;
      const pageToken = decryptToken(connection.page_access_token_enc!);

      // Plataforma destino: explícita o inferida del canal de la pieza
      const target = platform ?? (content.channel === "Facebook" ? "facebook" : "instagram");

      if (target === "instagram") {
        if (!connection.ig_user_id) {
          return NextResponse.json(
            { error: "Tu página no tiene una cuenta de Instagram Business vinculada." },
            { status: 409 }
          );
        }
        if (!content.imageUrl || !content.imageUrl.startsWith("http")) {
          return NextResponse.json(
            { error: "La pieza necesita una imagen generada (URL pública) para publicarse en Instagram." },
            { status: 409 }
          );
        }
        result = await publishToInstagram(connection.ig_user_id, pageToken, {
          imageUrl: content.imageUrl,
          caption,
        });
      } else {
        result = await publishToFacebook(connection.account_id!, pageToken, {
          message: caption,
          imageUrl: content.imageUrl,
        });
      }
    } else {
      // Fallback: conexión de Instagram Login (negocios sin página de FB).
      const igConnection = await getConnection(userId, businessId, "instagram");
      if (!igConnection || igConnection.status !== "active") {
        return NextResponse.json(
          { error: "No hay una conexión activa. Conectá Facebook o Instagram en Configuración." },
          { status: 409 }
        );
      }
      if (!igConnection.account_id) {
        return NextResponse.json(
          { error: "La conexión de Instagram no tiene una cuenta asociada. Reconectá en Configuración." },
          { status: 409 }
        );
      }
      // Sin página de Facebook no se puede publicar en FB, solo en Instagram.
      if (platform === "facebook" || content.channel === "Facebook") {
        return NextResponse.json(
          { error: "Esta cuenta está conectada solo con Instagram. Conectá una página de Facebook para publicar en Facebook." },
          { status: 409 }
        );
      }
      if (!content.imageUrl || !content.imageUrl.startsWith("http")) {
        return NextResponse.json(
          { error: "La pieza necesita una imagen generada (URL pública) para publicarse en Instagram." },
          { status: 409 }
        );
      }
      const igToken = decryptToken(igConnection.user_access_token_enc);
      result = await publishToInstagramDirect(igConnection.account_id, igToken, {
        imageUrl: content.imageUrl,
        caption,
      });
    }

    // Persistir el resultado REAL de la publicación (permalink incluido) — item 11 / A7.
    const nowIso = new Date().toISOString();
    const channel: "Instagram" | "Facebook" = result.platform === "facebook" ? "Facebook" : "Instagram";
    await ctx.repo.upsertContent(ctx.userId, {
      ...content,
      status: "published",
      publishedAt: nowIso,
      publishAttemptedAt: nowIso,
      publishedPlatform: channel,
      publishedMediaId: result.mediaId,
      publishedUrl: result.permalink,
      publishError: undefined, // limpiar cualquier error previo
      updatedAt: nowIso,
    });

    // North star: pieza publicada de verdad en la red del cliente.
    await logEvent({
      userId: ctx.userId,
      businessId,
      name: "content_published",
      props: { contentId, platform: result.platform, mediaId: result.mediaId },
    });

    return NextResponse.json({
      ok: true,
      mediaId: result.mediaId,
      platform: result.platform,
      permalink: result.permalink,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error publicando en Meta";
    console.error("[meta/publish]", msg);
    await logEvent({
      userId: await getSessionUserId(),
      businessId: businessId || null,
      name: "content_publish_failed",
      props: { contentId: contentId || null, error: msg },
    });
    // Registrar el error en la pieza para mostrar alerta + reintentar (item 11).
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
