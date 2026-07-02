import type { AppSnapshotInput } from "@/lib/schemas";
import type { Business, CalendarItem, ContentItem, Strategy } from "@/lib/types";
import type { DataRepository } from "./types";

// En dev, Next.js puede compilar cada ruta API con su propia instancia de este
// módulo. Colgamos el Map de globalThis para que TODAS las rutas compartan
// el mismo almacén (si no, /api/sync escribe en un Map y /api/content lee otro).
const g = globalThis as { __locaMemoryStore?: Map<string, AppSnapshotInput> };
const store: Map<string, AppSnapshotInput> = (g.__locaMemoryStore ||= new Map());

/** Repositorio en memoria: se usa para el modo demo (sin sesión de Supabase). */
export const serverMemoryRepository: DataRepository = {
  async sync(snapshot) {
    store.set(snapshot.userId, snapshot);
  },

  async getBusiness(userId, businessId) {
    const snap = store.get(userId);
    return (snap?.businesses.find((b) => b.id === businessId) as Business | undefined) ?? null;
  },

  async getStrategy(userId, businessId) {
    const snap = store.get(userId);
    return (snap?.strategies[businessId] as Strategy | undefined) ?? null;
  },

  async upsertStrategy(userId, businessId, strategy) {
    const snap = store.get(userId);
    if (!snap) {
      store.set(userId, {
        userId,
        businesses: [],
        strategies: { [businessId]: strategy },
        calendars: {},
        contents: [],
        syncedAt: new Date().toISOString(),
      });
      return;
    }
    store.set(userId, {
      ...snap,
      strategies: { ...snap.strategies, [businessId]: strategy },
    });
  },

  async patchBusiness(userId, businessId, patch) {
    const snap = store.get(userId);
    if (!snap) return null;
    const idx = snap.businesses.findIndex((b) => b.id === businessId);
    if (idx < 0) return null;
    const updated = {
      ...snap.businesses[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    } as Business;
    const businesses = snap.businesses.map((b, i) => (i === idx ? updated : b));
    store.set(userId, { ...snap, businesses });
    return updated;
  },

  async getCalendarItem(userId, businessId, itemId) {
    const snap = store.get(userId);
    const items = (snap?.calendars[businessId] ?? []) as CalendarItem[];
    return items.find((i) => i.id === itemId) ?? null;
  },

  async getContent(userId, businessId, contentId) {
    const snap = store.get(userId);
    return (
      (snap?.contents.find((c) => c.id === contentId && c.businessId === businessId) as
        | ContentItem
        | undefined) ?? null
    );
  },

  async upsertContent(userId, content) {
    const snap = store.get(userId);
    if (!snap) {
      store.set(userId, {
        userId,
        businesses: [],
        strategies: {},
        calendars: {},
        contents: [content],
        syncedAt: new Date().toISOString(),
      });
      return;
    }
    const idx = snap.contents.findIndex((c) => c.id === content.id);
    const contents =
      idx >= 0
        ? snap.contents.map((c, i) => (i === idx ? { ...c, ...content } : c))
        : [...snap.contents, content];
    store.set(userId, { ...snap, contents });
  },

  async deleteBusiness(userId, businessId) {
    const snap = store.get(userId);
    if (!snap) return;
    store.set(userId, {
      ...snap,
      businesses: snap.businesses.filter((b) => b.id !== businessId),
      strategies: Object.fromEntries(
        Object.entries(snap.strategies).filter(([bid]) => bid !== businessId)
      ),
      calendars: Object.fromEntries(
        Object.entries(snap.calendars).filter(([bid]) => bid !== businessId)
      ),
      contents: snap.contents.filter((c) => c.businessId !== businessId),
    });
  },

  async deleteContent(userId, contentId) {
    const snap = store.get(userId);
    if (!snap) return;
    store.set(userId, {
      ...snap,
      contents: snap.contents.filter((c) => c.id !== contentId),
    });
  },

  async setContentImage(userId, contentId, image) {
    const snap = store.get(userId);
    if (!snap) return;
    const contents = snap.contents.map((c) =>
      c.id === contentId ? ({ ...c, ...image } as typeof c) : c
    );
    store.set(userId, { ...snap, contents });
  },

  async getSnapshot(userId) {
    const snap = store.get(userId);
    return {
      businesses: (snap?.businesses ?? []) as Business[],
      strategies: (snap?.strategies ?? {}) as Record<string, Strategy>,
      calendars: (snap?.calendars ?? {}) as Record<string, CalendarItem[]>,
      contents: (snap?.contents ?? []) as ContentItem[],
    };
  },
};

export function getMemoryRepository(): DataRepository {
  return serverMemoryRepository;
}
