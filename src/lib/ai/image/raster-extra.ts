// Helpers de proporción sobre bytes (separados para no agrandar raster.ts).
import type { ImageFormat } from "@/lib/types";
import { aspectRatioOf } from "./formats";
export { finalizeImage, readImageDimensions } from "./raster";

/**
 * Chequeo de proporción del archivo crudo del proveedor. Para 1.91:1 (LinkedIn)
 * Gemini devuelve 16:9 y OpenAI 2048x1072: ambos se recortan después, así que
 * se acepta cualquier ratio entre 1.70 y 2.0. El resto: tolerancia 2%.
 */
export function imageMatchesAspectLoose(width: number, height: number, aspect: ImageFormat): boolean {
  if (!width || !height) return false;
  const ratio = width / height;
  if (aspect === "1.91:1") return ratio >= 1.7 && ratio <= 2.0;
  return Math.abs(ratio - aspectRatioOf(aspect)) / aspectRatioOf(aspect) <= 0.02;
}
