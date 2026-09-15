// ─────────────────────────────────────────────────────────────
// Publicación en una página de empresa de LinkedIn (Posts API versionada).
// Flujo con imagen: initializeUpload → PUT del binario → crear el post.
// ─────────────────────────────────────────────────────────────
import { liPostJson } from "./client";

export type PublishResult = {
  mediaId: string;
  platform: "linkedin";
  permalink?: string;
};

type InitUpload = {
  value?: { uploadUrl?: string; image?: string };
};

/**
 * Publica un post con imagen en la página de empresa (orgUrn = urn:li:organization:{id}).
 * El token es el del usuario que administra la org (w_organization_social).
 */
export async function publishToLinkedIn(
  orgUrn: string,
  accessToken: string,
  input: { imageUrl: string; caption: string }
): Promise<PublishResult> {
  if (!input.imageUrl?.startsWith("http")) {
    throw new Error("LinkedIn requiere una URL pública de imagen para publicar");
  }

  // 1. Inicializar la subida de la imagen (owner = la organización).
  const init = await liPostJson<InitUpload>("/rest/images?action=initializeUpload", accessToken, {
    initializeUploadRequest: { owner: orgUrn },
  });
  const uploadUrl = init.data.value?.uploadUrl;
  const imageUrn = init.data.value?.image;
  if (!uploadUrl || !imageUrn) {
    throw new Error("LinkedIn no devolvió la URL de subida de imagen");
  }

  // 2. Descargar el binario de la imagen y subirlo a la uploadUrl.
  const imgRes = await fetch(input.imageUrl, { cache: "no-store" });
  if (!imgRes.ok) throw new Error("No se pudo descargar la imagen para subir a LinkedIn");
  const bytes = Buffer.from(await imgRes.arrayBuffer());
  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": imgRes.headers.get("content-type") || "image/jpeg",
    },
    body: bytes,
    cache: "no-store",
  });
  if (!put.ok) throw new Error(`Falló la subida de la imagen a LinkedIn (HTTP ${put.status})`);

  // 3. Crear el post con la imagen ya subida.
  const post = await liPostJson<Record<string, unknown>>("/rest/posts", accessToken, {
    author: orgUrn,
    commentary: input.caption,
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    content: { media: { id: imageUrn } },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  });

  const postUrn = post.restliId || "";
  const permalink = postUrn
    ? `https://www.linkedin.com/feed/update/${encodeURIComponent(postUrn)}`
    : undefined;
  return { mediaId: postUrn, platform: "linkedin", permalink };
}
