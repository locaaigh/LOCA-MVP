// ─────────────────────────────────────────────────────────────
// Publicación en Instagram vía graph.instagram.com (Instagram Login).
// Mismo flujo de contenedor que Meta (media → media_publish) pero contra
// el host de Instagram y con el token del usuario (no hay Page token).
// ─────────────────────────────────────────────────────────────
import { igGet, igPost } from "./graph";

export type PublishResult = {
  /** ID del media creado en Instagram */
  mediaId: string;
  platform: "instagram";
  /** Permalink público del post (para "ver contenido"). Best-effort. */
  permalink?: string;
};

const CONTAINER_POLL_MS = 1500;
const CONTAINER_MAX_TRIES = 10;

/**
 * Publica una imagen en el feed de Instagram (cuenta profesional).
 * Flujo de dos pasos: crear contenedor → esperar procesamiento → publicar.
 * La imagen debe ser una URL pública (JPEG); IG no acepta data URLs.
 */
export async function publishToInstagram(
  igUserId: string,
  accessToken: string,
  input: { imageUrl: string; caption: string }
): Promise<PublishResult> {
  if (!input.imageUrl.startsWith("http")) {
    throw new Error("Instagram requiere una URL pública de imagen (no data URL)");
  }

  // 1. Crear el contenedor de media
  const container = await igPost<{ id: string }>(`/${igUserId}/media`, accessToken, {
    image_url: input.imageUrl,
    caption: input.caption,
  });

  // 2. Esperar a que el contenedor termine de procesarse
  for (let i = 0; i < CONTAINER_MAX_TRIES; i++) {
    const status = await igGet<{ status_code?: string }>(`/${container.id}`, accessToken, {
      fields: "status_code",
    });
    if (status.status_code === "FINISHED") break;
    if (status.status_code === "ERROR") {
      throw new Error("Instagram no pudo procesar la imagen (contenedor en error)");
    }
    await new Promise((r) => setTimeout(r, CONTAINER_POLL_MS));
  }

  // 3. Publicar
  const published = await igPost<{ id: string }>(`/${igUserId}/media_publish`, accessToken, {
    creation_id: container.id,
  });

  // 4. Permalink (best-effort, no rompe si falla)
  let permalink: string | undefined;
  try {
    const info = await igGet<{ permalink?: string }>(`/${published.id}`, accessToken, {
      fields: "permalink",
    });
    permalink = info.permalink;
  } catch {
    /* noop */
  }
  return { mediaId: published.id, platform: "instagram", permalink };
}
