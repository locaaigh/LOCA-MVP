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

export function useGenerators() {
  const store = useStore();

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
    const res = await api.content(business.id, item.id);
    const content = withCrosspost(res.data, business);
    store.upsertContent(content);
    store.updateCalendarItem({ ...item, status: "generado" });
    return content;
  }

  async function generateMonthContents(
    business: Business,
    count = 16,
    onProgress?: (done: number, total: number) => void
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
    let done = 0;
    for (const item of pending) {
      try {
        const res = await api.content(business.id, item.id);
        st().upsertContent(withCrosspost(res.data, business));
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

  async function generateAllContent(
    business: Business,
    onProgress?: (done: number, total: number) => void
  ) {
    if (!store.strategies[business.id]) throw new Error("Generá la estrategia primero");
    const items = store.calendars[business.id] || [];
    const existingItemIds = new Set(
      store.contents.filter((c) => c.businessId === business.id).map((c) => c.calendarItemId)
    );
    const pending = items.filter((it) => !existingItemIds.has(it.id));
    let done = 0;
    for (const item of pending) {
      try {
        const res = await api.content(business.id, item.id);
        store.upsertContent(withCrosspost(res.data, business));
        store.updateCalendarItem({ ...item, status: "generado" });
      } catch {
        /* continúa */
      }
      done++;
      onProgress?.(done, pending.length);
    }
    return pending.length;
  }

  async function generateImage(content: ContentItem, business: Business) {
    store.updateContent(content.id, { imageStatus: "generando" });
    try {
      const res = await api.image(business.id, content.id);
      store.updateContent(content.id, {
        imageUrl: res.data.imageUrl,
        imageProvider: res.data.provider,
        imageStatus: res.data.status,
        imageError: res.data.error,
      });
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
