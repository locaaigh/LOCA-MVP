// ─────────────────────────────────────────────────────────────
// Referencias reales del cliente para image-to-image: fotos del producto
// (ProductService.photos) y foto del profesional (Business.personPhotos).
// Mismo stack de referencias en todas las piezas del mes.
// ─────────────────────────────────────────────────────────────
import type { Business, ContentItem, ProductService, UploadedPhoto } from "@/lib/types";
import type { ImageReference } from "../providers/types";
import { downscaleForVision, fromDataUrl, mimeFromBytes } from "./raster";

export interface CollectedReferences {
  product: ImageReference[];
  person: ImageReference[];
  productName?: string;
  productNotes: string[];
  /** true si el negocio es un profesional independiente / marca personal. */
  isProfessional: boolean;
  /** true si hay foto de la persona pero falta el consentimiento. */
  consentMissing: boolean;
  warnings: string[];
}

export const CONSENT_TEXT_VERSION = "2026-10-v1";

export function isProfessionalBusiness(b: Business): boolean {
  return b.businessStage === "profesional_independiente" || /marca personal/i.test(b.businessType || "");
}

function consentRequired(): boolean {
  return (process.env.AI_IMAGE_CONSENT_REQUIRED || "true").toLowerCase() !== "false";
}

/** Producto de la pieza: el que se menciona en el copy, si no el top seller, si no el primero con fotos. */
export function pickProductForContent(business: Business, content?: Pick<ContentItem, "title" | "caption" | "visualConcept">): ProductService | undefined {
  const withPhotos = business.productsServices.filter((p) => p.type === "producto" && (p.photos?.length ?? 0) > 0);
  if (!withPhotos.length) return undefined;
  const hay = `${content?.title ?? ""} ${content?.caption ?? ""} ${content?.visualConcept ?? ""}`.toLowerCase();
  const mentioned = withPhotos.find((p) => p.name && hay.includes(p.name.toLowerCase()));
  return mentioned ?? withPhotos.find((p) => p.isTopSeller) ?? withPhotos[0];
}

async function fetchPhoto(photo: UploadedPhoto, timeoutMs = 10_000): Promise<{ bytes: Buffer; mimeType: string } | null> {
  try {
    if (photo.url) {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const res = await fetch(photo.url, { signal: ctrl.signal });
        if (!res.ok) return null;
        const bytes = Buffer.from(await res.arrayBuffer());
        if (bytes.length > 12 * 1024 * 1024) return null;
        const mime = res.headers.get("content-type")?.split(";")[0] || mimeFromBytes(bytes);
        return { bytes, mimeType: mime.startsWith("image/") ? mime : mimeFromBytes(bytes) };
      } finally {
        clearTimeout(t);
      }
    }
    if (photo.dataUrl) return fromDataUrl(photo.dataUrl);
  } catch {
    return null;
  }
  return null;
}

async function toReference(photo: UploadedPhoto, role: ImageReference["role"]): Promise<ImageReference | null> {
  const raw = await fetchPhoto(photo);
  if (!raw) return null;
  // Las referencias no necesitan más de ~1536 px: menos tokens de entrada, misma fidelidad.
  const small = await downscaleForVision(raw.bytes, 1536);
  return { data: small.bytes, mimeType: small.mimeType, role, label: photo.label };
}

export async function collectReferences(
  business: Business,
  content?: Pick<ContentItem, "title" | "caption" | "visualConcept">,
  opts?: { maxProduct?: number; maxPerson?: number; includeProduct?: boolean; includePerson?: boolean }
): Promise<CollectedReferences> {
  const out: CollectedReferences = {
    product: [],
    person: [],
    productNotes: [],
    isProfessional: isProfessionalBusiness(business),
    consentMissing: false,
    warnings: [],
  };

  if (opts?.includeProduct !== false) {
    const product = pickProductForContent(business, content);
    if (product?.photos?.length) {
      out.productName = product.name;
      const photos = product.photos.slice(0, opts?.maxProduct ?? 3);
      const refs = await Promise.all(photos.map((p) => toReference(p, "product")));
      refs.forEach((r, i) => {
        if (r) {
          out.product.push(r);
          if (i > 0) out.productNotes.push(photos[i].label || "another angle");
        }
      });
      if (!out.product.length) out.warnings.push("No se pudieron descargar las fotos del producto; se genera sin referencia.");
    }
  }

  if (opts?.includePerson !== false) {
    const personPhotos = (business.personPhotos ?? []).filter((p) => p.kind === "person" || p.kind === "other");
    if (personPhotos.length) {
      const consent = business.imageConsent?.accepted === true;
      if (consentRequired() && !consent) {
        out.consentMissing = true;
        out.warnings.push("Hay foto de la persona pero falta el consentimiento de uso de imagen: se genera sin rostro.");
      } else {
        const refs = await Promise.all(personPhotos.slice(0, opts?.maxPerson ?? 4).map((p) => toReference(p, "person")));
        out.person = refs.filter((r): r is ImageReference => !!r);
        if (!out.person.length) out.warnings.push("No se pudieron descargar las fotos de la persona; se genera sin rostro.");
      }
    }
  }

  return out;
}
