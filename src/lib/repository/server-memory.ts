import type { AppSnapshotInput } from "@/lib/schemas";
import type { Business, CalendarItem, ContentItem, Strategy } from "@/lib/types";
import type { DataRepository } from "./types";

const store = new Map<string, AppSnapshotInput>();

/** Repositorio en memoria del servidor (reemplazar por Supabase en producción). */
export const serverMemoryRepository: DataRepository = {
  async sync(snapshot) {
    store.set(snapshot.userId, snapshot);
  },

  getBusiness(userId, businessId) {
    const snap = store.get(userId);
    return (snap?.businesses.find((b) => b.id === businessId) as Business | undefined) ?? null;
  },

  getStrategy(userId, businessId) {
    const snap = store.get(userId);
    return (snap?.strategies[businessId] as Strategy | undefined) ?? null;
  },

  getCalendarItem(userId, businessId, itemId) {
    const snap = store.get(userId);
    const items = (snap?.calendars[businessId] ?? []) as CalendarItem[];
    return items.find((i) => i.id === itemId) ?? null;
  },

  getContent(userId, businessId, contentId) {
    const snap = store.get(userId);
    return (
      (snap?.contents.find((c) => c.id === contentId && c.businessId === businessId) as
        | ContentItem
        | undefined) ?? null
    );
  },
};

export function getRepository(): DataRepository {
  return serverMemoryRepository;
}
