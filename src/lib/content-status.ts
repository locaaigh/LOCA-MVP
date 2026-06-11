// ─────────────────────────────────────────────────────────────
// Clasificación de contenidos para las tabs (Revisión / Aprobados / Publicados).
// Mientras no haya API real de redes, "publicado" se infiere por fecha pasada
// + aprobado, o por status explícito published/publicado_manualmente.
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

export function isPublished(c: ContentItem, dateIso?: string): boolean {
  if (c.status === "published" || c.status === "publicado_manualmente") return true;
  if (c.status === "aprobado" && datePassed(dateIso)) return true;
  return false;
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
