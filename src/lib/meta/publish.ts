// ─────────────────────────────────────────────────────────────
// Publicación en Instagram (contenedor + media_publish) y en el
// feed de una página de Facebook, con el Page access token.
// ─────────────────────────────────────────────────────────────
import { graphGet, graphPost } from "./graph";

export type PublishResult = {
  /** ID del post/media creado en Meta */
  mediaId: string;
  platform: "instagram" | "facebook";
};

const CONTAINER_POLL_MS = 1500;
const CONTAINER_MAX_TRIES = 10;

/**
 * Publica una imagen en el feed de Instagram (cuenta Business).
 * Flujo de dos pasos: crear contenedor → esperar procesamiento → publicar.
 * La imagen debe ser una URL pública (JPEG); IG no acepta data URLs.
 */
export async function publishToInstagram(
  igUserId: string,
  pageAccessToken: string,
  input: { imageUrl: string; caption: string }
): Promise<PublishResult> {
  if (!input.imageUrl.startsWith("http")) {
    throw new Error("Instagram requiere una URL pública de imagen (no data URL)");
  }

  // 1. Crear el contenedor de media
  const container = await graphPost<{ id: string }>(`/${igUserId}/media`, pageAccessToken, {
    image_url: input.imageUrl,
    caption: input.caption,
  });

  // 2. Esperar a que el contenedor termine de procesarse
  for (let i = 0; i < CONTAINER_MAX_TRIES; i++) {
    const status = await graphGet<{ status_code?: string }>(
      `/${container.id}`,
      pageAccessToken,
      { fields: "status_code" }
    );
    if (status.status_code === "FINISHED") break;
    if (status.status_code === "ERROR") {
      throw new Error("Instagram no pudo procesar la imagen (contenedor en error)");
    }
    await new Promise((r) => setTimeout(r, CONTAINER_POLL_MS));
  }

  // 3. Publicar
  const published = await graphPost<{ id: string }>(
    `/${igUserId}/media_publish`,
    pageAccessToken,
    { creation_id: container.id }
  );
  return { mediaId: published.id, platform: "instagram" };
}

/**
 * Publica en el feed de una página de Facebook.
 * Con imagen usa /photos (crea el post con foto); sin imagen, /feed.
 */
export async function publishToFacebook(
  pageId: string,
  pageAccessToken: string,
  input: { message: string; imageUrl?: string }
): Promise<PublishResult> {
  if (input.imageUrl?.startsWith("http")) {
    const res = await graphPost<{ post_id?: string; id: string }>(
      `/${pageId}/photos`,
      pageAccessToken,
      { url: input.imageUrl, message: input.message }
    );
    return { mediaId: res.post_id || res.id, platform: "facebook" };
  }
  const res = await graphPost<{ id: string }>(`/${pageId}/feed`, pageAccessToken, {
    message: input.message,
  });
  return { mediaId: res.id, platform: "facebook" };
}
