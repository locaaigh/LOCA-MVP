// ─────────────────────────────────────────────────────────────
// Clasificación de contenidos para las tabs (Revisión / Aprobados / Publicados).
// "Publicado" = publicación REAL (status published/publicado_manualmente o con
// publishedAt). Ya NO se infiere por fecha vencida. Ver PLAN-v2 item 11.
// ─────────────────────────────────────────────────────────────
import type { ContentItem } from "./types";

export type ContentBucket = "revision" | "aprobados" | "publicados";

export function isApproved(c: ContentItem): boolean {
  return c.status === "aprobado";
}

export function datePassed(dateIso?: string): boolean {
  if (!dateIso) return false;
  // Comparar por fecha (sin hora) para evitar falsos negativos del día actual.
  const today = new Date().toISOString().slice(0, 10);
  return dateIso.slice(0, 10) < today;
}

/** Publicación REAL confirmada (no inferida por fecha). */
export function isPublished(c: ContentItem, _dateIso?: string): boolean {
  return c.status === "published" || c.status === "publicado_manualmente" || !!c.publishedAt;
}

/** La última publicación falló y todavía no se publicó → alerta + reintentar. */
export function hasPublishError(c: ContentItem): boolean {
  return !!c.publishError && !isPublished(c);
}

export function bucketOf(c: ContentItem, dateIso?: string): ContentBucket {
  if (isPublished(c, dateIso)) return "publicados";
  if (isApproved(c)) return "aprobados";
  return "revision";
}

// ¿Está protegido contra edición accidental? (aprobado o publicado)
export function isLocked(c: ContentItem, dateIso?: string): boolean {
  return isApproved(c) || isPublished(c, dateIso);
}
