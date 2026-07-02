"use client";

import type { Business, ContentItem } from "@/lib/types";
import { useStore } from "@/lib/store";

export type SyncOptions = {
  includeBusiness?: Business;
  /** Garantiza que una pieza recién creada esté en el snapshot antes de /api/image */
  includeContent?: ContentItem;
};

/** Sincroniza el estado local con el repositorio del servidor antes de llamadas de IA. */
export async function syncRepositoryToServer(opts?: SyncOptions): Promise<void> {
  const s = useStore.getState();
  let businesses = s.businesses;
  if (opts?.includeBusiness) {
    const b = opts.includeBusiness;
    const idx = businesses.findIndex((x) => x.id === b.id);
    businesses =
      idx >= 0 ? businesses.map((x, i) => (i === idx ? b : x)) : [...businesses, b];
  }

  let contents = s.contents;
  if (opts?.includeContent) {
    const c = opts.includeContent;
    const idx = contents.findIndex((x) => x.id === c.id);
    contents =
      idx >= 0 ? contents.map((x, i) => (i === idx ? c : x)) : [...contents, c];
  }

  // Las imágenes base64 (~2MB c/u) no viajan en el sync: inflan el payload y
  // pueden superar el límite del servidor. La URL real vive en Supabase Storage.
  contents = contents.map((c) =>
    c.imageUrl?.startsWith("data:") ? { ...c, imageUrl: undefined } : c
  );

  const userId =
    s.user?.id || opts?.includeBusiness?.userId || businesses[0]?.userId || "anon";

  const res = await fetch("/api/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-loca-user-id": userId,
    },
    body: JSON.stringify({
      businesses,
      strategies: s.strategies,
      calendars: s.calendars,
      contents,
    }),
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || "No se pudo sincronizar tus datos");
  }
}

export function locaUserHeaders(business?: Business): Record<string, string> {
  const s = useStore.getState();
  const userId =
    s.user?.id || business?.userId || s.businesses[0]?.userId || "anon";
  return { "x-loca-user-id": userId };
}
