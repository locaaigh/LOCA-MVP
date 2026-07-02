"use client";

import { api } from "./api";
import { useStore } from "./store";
import type { Business, CalendarItem, Channel, ContentItem, GoogleAdsStrategy, MetaAdsStrategy } from "./types";

function withCrosspost(content: ContentItem, business: Business): ContentItem {
  if (content.distributionPlatforms?.length) return content;
  const usesFacebook = (business.marketingChannels || []).some((c) => /face/i.test(c));
  const platforms: Channel[] = [content.channel];
  if (/insta/i.test(content.channel) && usesFacebook && !platforms.includes("Facebook")) {
    platforms.push("Facebook");
  }
  return platforms.length > 1 ? { ...content, distributionPlatforms: platforms } : content;
}

/** Pool simple: corre tareas con un máximo de `limit` en paralelo. */
function createLimiter(limit: number) {
  let active = 0;
  const queue: (() => void)[] = [];
  const next = () => {
    active--;
    queue.shift()?.();
  };
  return function run<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const start = () => {
        active++;
        task().then(resolve, reject).finally(next);
      };
      if (active < limit) start();
      else queue.push(start);
    });
  };
}

// Máximo de imágenes generándose a la vez (no saturar el rate limit de Gemini).
const IMAGE_CONCURRENCY = 2;

export function useGenerators() {
  const store = useStore();

  type ProgressFn = (done: number, total: number, phase?: "contenido" | "imagen") => void;

  async function generateContentWithImage(
    business: Business,
    item: CalendarItem
  ) {
    const content = await generateContentOnly(business, item);
    try {
      await generateImage(content, business, { skipSync: true });
    } catch (e) {
      console.warn("[LOCA] Imagen no generada:", e instanceof Error ? e.message : e);
    }
    return content;
  }

  /** Genera solo el texto de la pieza (rápido) y la deja con imagen pendiente. */
  async function generateContentOnly(business: Business, item: CalendarItem) {
    const res = await api.content(business.id, item.id);
    const content = withCrosspost(res.data, business);
    store.upsertContent(content);
    store.updateCalendarItem({ ...item, status: "generado" });
    return content;
  }

  async function generateStrategy(business: Business, feedback?: string) {
    const res = await api.strategy(business.id, feedback);
    store.setStrategy(business.id, { ...res.data, status: "pending_review" });
    store.setFlow(business.id, { strategy: "pending_review" });
    return res.meta;
  }

  async function generateCalendar(business: Business, count: number, feedback?: string) {
    let strategy = store.strategies[business.id];
    if (!strategy) {
      const s = await api.strategy(business.id);
      store.setStrategy(business.id, { ...s.data, status: "pending_review" });
      strategy = s.data;
    }
    const res = await api.calendar(business.id, count, feedback);
    store.setCalendar(business.id, res.data);
    store.setFlow(business.id, { calendar: "pending_review" });
    return res.meta;
  }

  async function generateContentForItem(business: Business, item: CalendarItem) {
    if (!store.strategies[business.id]) throw new Error("Generá la estrategia primero");
    return generateContentWithImage(business, item);
  }

  async function generateMonthContents(
    business: Business,
    count = 16,
    onProgress?: ProgressFn
  ) {
    const st = () => useStore.getState();

    let strategy = st().strategies[business.id];
    if (!strategy) {
      const s = await api.strategy(business.id);
      st().setStrategy(business.id, { ...s.data, status: "pending_review" });
      strategy = s.data;
    }

    let cal = st().calendars[business.id] || [];
    if (!cal.length) {
      const res = await api.calendar(business.id, count);
      st().setCalendar(business.id, res.data);
      st().setFlow(business.id, { calendar: "approved" });
      cal = res.data;
    }

    const existing = new Set(
      st().contents.filter((c) => c.businessId === business.id).map((c) => c.calendarItemId)
    );
    const pending = cal.filter((it) => !existing.has(it.id));
    await generateBatch(business, pending, onProgress);
    st().setFlow(business.id, { content: "pending_review" });
    return pending.length;
  }

  async function generateAllContent(
    business: Business,
    onProgress?: ProgressFn
  ) {
    if (!store.strategies[business.id]) throw new Error("Generá la estrategia primero");
    const items = store.calendars[business.id] || [];
    const existingItemIds = new Set(
      store.contents.filter((c) => c.businessId === business.id).map((c) => c.calendarItemId)
    );
    const pending = items.filter((it) => !existingItemIds.has(it.id));
    await generateBatch(business, pending, onProgress);
    return pending.length;
  }

  /**
   * Batch asincrónico: los textos se generan en secuencia (son rápidos y
   * aparecen enseguida en pantalla); las imágenes se disparan en paralelo
   * con límite de concurrencia y van llegando de a poco, sin bloquear nada.
   */
  async function generateBatch(
    business: Business,
    pending: CalendarItem[],
    onProgress?: ProgressFn
  ) {
    if (!pending.length) return;
    const limiter = createLimiter(IMAGE_CONCURRENCY);
    const imageTasks: Promise<void>[] = [];
    let imagesDone = 0;

    for (let i = 0; i < pending.length; i++) {
      onProgress?.(i + 1, pending.length, "contenido");
      try {
        const content = await generateContentOnly(business, pending[i]);
        imageTasks.push(
          limiter(async () => {
            try {
              // skipSync: /api/content ya persistió la pieza en el servidor.
              await generateImage(content, business, { skipSync: true });
            } catch (e) {
              console.warn(
                "[LOCA] Imagen no generada:",
                e instanceof Error ? e.message : e
              );
            } finally {
              imagesDone++;
              onProgress?.(imagesDone, pending.length, "imagen");
            }
          })
        );
      } catch {
        /* continúa con la siguiente pieza */
      }
    }

    // Textos listos: esperamos las imágenes que quedan (van llegando en vivo).
    onProgress?.(imagesDone, pending.length, "imagen");
    await Promise.allSettled(imageTasks);
  }

  async function generateImage(
    content: ContentItem,
    business: Business,
    opts?: { skipSync?: boolean }
  ) {
    store.updateContent(content.id, { imageStatus: "generando" });
    try {
      const res = await api.image(
        business.id,
        content.id,
        opts?.skipSync ? { skipSync: true } : { includeBusiness: business, includeContent: content }
      );
      const patch = {
        imageUrl: res.data.imageUrl,
        imageProvider: res.data.provider,
        imageStatus: res.data.status,
        imageError: res.data.error,
      };
      try {
        store.updateContent(content.id, patch);
      } catch (e) {
        const quota =
          e instanceof DOMException && e.name === "QuotaExceededError"
            ? "La imagen es muy pesada para guardar en el navegador. Regenerala o usá menos piezas a la vez."
            : null;
        store.updateContent(content.id, {
          imageStatus: "error",
          imageError: quota || "No se pudo guardar la imagen en el dispositivo",
        });
        throw new Error(quota || "No se pudo guardar la imagen");
      }
      if (res.data.status === "error") {
        throw new Error(res.data.error || res.meta?.warning || "No se pudo generar la imagen");
      }
      return res.data;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error";
      store.updateContent(content.id, { imageStatus: "error", imageError: msg });
      throw e;
    }
  }

  async function applyFeedback(business: Business, content: ContentItem, feedback: string) {
    const res = await api.feedback(business.id, content.id, feedback);
    store.upsertContent(res.data);
    return res;
  }

  async function generateAds(business: Business, platform: "meta" | "google") {
    const res = platform === "meta" ? await api.metaAds(business.id) : await api.googleAds(business.id);
    store.setAdStrategy({
      id: `ad_${platform}_${business.id}`,
      businessId: business.id,
      platform,
      meta: platform === "meta" ? (res.data as MetaAdsStrategy) : undefined,
      google: platform === "google" ? (res.data as GoogleAdsStrategy) : undefined,
      createdAt: new Date().toISOString(),
    });
    return res.meta;
  }

  return {
    generateStrategy,
    generateCalendar,
    generateMonthContents,
    generateContentForItem,
    generateAllContent,
    generateImage,
    applyFeedback,
    generateAds,
  };
}
