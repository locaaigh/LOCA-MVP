"use client";

import { api } from "./api";
import { useStore } from "./store";
import type { Business, CalendarItem, ContentItem } from "./types";

// Hook con las acciones de generación, atadas al store.
export function useGenerators() {
  const store = useStore();

  async function generateStrategy(business: Business, feedback?: string) {
    const res = await api.strategy(business, feedback);
    store.setStrategy(business.id, { ...res.data, status: "pending_review" });
    store.setFlow(business.id, { strategy: "pending_review" });
    return res.meta;
  }

  async function generateCalendar(business: Business, count: number, feedback?: string) {
    let strategy = store.strategies[business.id];
    if (!strategy) {
      const s = await api.strategy(business);
      store.setStrategy(business.id, { ...s.data, status: "pending_review" });
      strategy = s.data;
    }
    const res = await api.calendar(business, strategy, count, feedback);
    store.setCalendar(business.id, res.data);
    store.setFlow(business.id, { calendar: "pending_review" });
    return res.meta;
  }

  // Genera la pieza de contenido para un item del calendario (si no existe)
  async function generateContentForItem(business: Business, item: CalendarItem) {
    const strategy = store.strategies[business.id];
    if (!strategy) throw new Error("Generá la estrategia primero");
    const res = await api.content(business, strategy, item);
    const content = res.data;
    store.upsertContent(content);
    store.updateCalendarItem({ ...item, status: "generado" });
    return content;
  }

  // Flujo nuevo: tras aprobar estrategia, generar el PAQUETE completo de
  // contenidos. El calendario de ideas se arma internamente (auto-aprobado) y
  // no se le muestra al cliente como paso previo.
  async function generateMonthContents(
    business: Business,
    count = 16,
    onProgress?: (done: number, total: number) => void
  ) {
    const st = () => useStore.getState();

    // 1) Estrategia (si no existe)
    let strategy = st().strategies[business.id];
    if (!strategy) {
      const s = await api.strategy(business);
      st().setStrategy(business.id, { ...s.data, status: "pending_review" });
      strategy = s.data;
    }

    // 2) Calendario interno (si no existe) — auto-aprobado, no es un paso del cliente
    let cal = st().calendars[business.id] || [];
    if (!cal.length) {
      const res = await api.calendar(business, strategy, count);
      st().setCalendar(business.id, res.data);
      st().setFlow(business.id, { calendar: "approved" });
      cal = res.data;
    }

    // 3) Contenidos completos para cada item sin pieza
    const existing = new Set(
      st().contents.filter((c) => c.businessId === business.id).map((c) => c.calendarItemId)
    );
    const pending = cal.filter((it) => !existing.has(it.id));
    let done = 0;
    for (const item of pending) {
      try {
        const res = await api.content(business, strategy, item);
        st().upsertContent(res.data);
        st().updateCalendarItem({ ...item, status: "generado" });
      } catch {
        /* continúa */
      }
      done++;
      onProgress?.(done, pending.length);
    }
    st().setFlow(business.id, { content: "pending_review" });
    return pending.length;
  }

  // Genera contenido para todos los items que aún no tienen pieza.
  async function generateAllContent(
    business: Business,
    onProgress?: (done: number, total: number) => void
  ) {
    const strategy = store.strategies[business.id];
    if (!strategy) throw new Error("Generá la estrategia primero");
    const items = store.calendars[business.id] || [];
    const existingItemIds = new Set(
      store.contents.filter((c) => c.businessId === business.id).map((c) => c.calendarItemId)
    );
    const pending = items.filter((it) => !existingItemIds.has(it.id));
    let done = 0;
    for (const item of pending) {
      try {
        const res = await api.content(business, strategy, item);
        store.upsertContent(res.data);
        store.updateCalendarItem({ ...item, status: "generado" });
      } catch {
        /* continúa con el resto */
      }
      done++;
      onProgress?.(done, pending.length);
    }
    return pending.length;
  }

  async function generateImage(content: ContentItem, business: Business) {
    store.updateContent(content.id, { imageStatus: "generando" });
    try {
      const res = await api.image(
        content.imagePrompt,
        content.imageFormat,
        business.name,
        content.visualConcept
      );
      store.updateContent(content.id, {
        imageUrl: res.imageUrl,
        imageProvider: res.provider,
        imageStatus: res.status,
        imageError: res.error,
      });
      return res;
    } catch (e: any) {
      store.updateContent(content.id, { imageStatus: "error", imageError: e?.message });
      throw e;
    }
  }

  async function applyFeedback(business: Business, content: ContentItem, feedback: string) {
    const res = await api.feedback(business, content, feedback);
    store.upsertContent(res.data);
    return res;
  }

  async function generateAds(business: Business, platform: "meta" | "google") {
    const res = platform === "meta" ? await api.metaAds(business) : await api.googleAds(business);
    store.setAdStrategy({
      id: `ad_${platform}_${business.id}`,
      businessId: business.id,
      platform,
      meta: platform === "meta" ? (res.data as any) : undefined,
      google: platform === "google" ? (res.data as any) : undefined,
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
