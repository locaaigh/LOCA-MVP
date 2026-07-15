import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/supabase/server";
import { resolveContent, jsonError } from "@/lib/repository/resolve";
import { getConnection } from "@/lib/meta/repository";
import { decryptToken } from "@/lib/meta/crypto";
import { publishToInstagram, publishToFacebook } from "@/lib/meta/publish";

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
  try {
    // Publicar requiere cuenta real (los tokens se guardan por usuario de Supabase)
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Necesitás una cuenta para publicar" }, { status: 401 });
    }

    const { businessId, contentId, platform } = (await req.json()) as PublishBody;
    if (!businessId || !contentId) {
      return NextResponse.json({ error: "Faltan businessId o contentId" }, { status: 400 });
    }

    const resolved = await resolveContent(req, businessId, contentId);
    if ("error" in resolved) return jsonError(resolved);
    const { ctx, content } = resolved;

    const connection = await getConnection(userId, businessId);
    if (!connection || connection.status !== "active") {
      return NextResponse.json(
        { error: "No hay una conexión activa con Meta. Conectá tus cuentas en Configuración." },
        { status: 409 }
      );
    }
    if (!connection.page_access_token_enc) {
      return NextResponse.json(
        { error: "La conexión no tiene una página de Facebook asociada." },
        { status: 409 }
      );
    }
    const pageToken = decryptToken(connection.page_access_token_enc);

    // Plataforma destino: explícita o inferida del canal de la pieza
    const target =
      platform ?? (content.channel === "Facebook" ? "facebook" : "instagram");

    // Caption final: caption + hashtags
    const caption = [content.caption, content.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")]
      .filter(Boolean)
      .join("\n\n");

    let result;
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
      result = await publishToFacebook(connection.page_id!, pageToken, {
        message: caption,
        imageUrl: content.imageUrl,
      });
    }

    // Marcar la pieza como publicada (status "published" ya la clasifica la UI)
    await ctx.repo.upsertContent(ctx.userId, {
      ...content,
      status: "published",
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, mediaId: result.mediaId, platform: result.platform });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error publicando en Meta";
    console.error("[meta/publish]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
