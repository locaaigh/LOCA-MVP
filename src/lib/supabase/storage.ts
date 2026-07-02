import { getSupabaseAdmin } from "./admin";

const BUCKET = "content-images";

/**
 * Sube una imagen data URL (base64) al bucket público y devuelve su URL.
 * Las imágenes de Gemini pesan ~2MB: guardarlas como URL evita reventar
 * el localStorage del navegador y los límites de payload de Vercel.
 */
export async function uploadContentImage(
  userId: string,
  contentId: string,
  dataUrl: string
): Promise<string> {
  const match = dataUrl.match(/^data:(image\/[a-z+.-]+);base64,(.+)$/);
  if (!match) throw new Error("Formato de imagen inesperado");
  const [, mime, base64] = match;
  const ext = mime.split("/")[1]?.replace("jpeg", "jpg") || "png";
  const buffer = Buffer.from(base64, "base64");
  // Timestamp en el nombre: al regenerar no pisa el archivo cacheado por el browser.
  const path = `${userId}/${contentId}-${Date.now()}.${ext}`;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: mime,
    upsert: true,
  });
  if (error) throw new Error(`No se pudo guardar la imagen: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
