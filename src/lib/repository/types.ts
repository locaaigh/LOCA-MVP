import type { Business, CalendarItem, ContentItem, Strategy } from "@/lib/types";
import type { AppSnapshotInput } from "@/lib/schemas";

export type { AppSnapshotInput as AppSnapshot };

export interface DataRepository {
  sync(snapshot: AppSnapshotInput): Promise<void>;
  getBusiness(userId: string, businessId: string): Promise<Business | null>;
  getStrategy(userId: string, businessId: string): Promise<Strategy | null>;
  getCalendarItem(
    userId: string,
    businessId: string,
    itemId: string
  ): Promise<CalendarItem | null>;
  getContent(userId: string, businessId: string, contentId: string): Promise<ContentItem | null>;
  upsertContent(userId: string, content: ContentItem): Promise<void>;
  /** Actualiza SOLO los campos de imagen de un contenido (no pisa el resto). */
  setContentImage(
    userId: string,
    contentId: string,
    image: { imageUrl?: string; imageStatus?: string; imageError?: string }
  ): Promise<void>;
  /** Snapshot completo del usuario (para hidratar el cliente al loguear). */
  getSnapshot(userId: string): Promise<{
    businesses: Business[];
    strategies: Record<string, Strategy>;
    calendars: Record<string, CalendarItem[]>;
    contents: ContentItem[];
  }>;
  /** Borrado explícito de un negocio y todo lo suyo (única forma de borrar negocios). */
  deleteBusiness(userId: string, businessId: string): Promise<void>;
  /** Borrado explícito de una pieza de contenido. */
  deleteContent(userId: string, contentId: string): Promise<void>;
}
