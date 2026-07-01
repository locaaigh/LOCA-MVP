"use client";

import type { Business } from "@/lib/types";
import { useStore } from "@/lib/store";

/** Sincroniza el estado local con el repositorio del servidor antes de llamadas de IA. */
export async function syncRepositoryToServer(opts?: { includeBusiness?: Business }): Promise<void> {
  const s = useStore.getState();
  let businesses = s.businesses;
  if (opts?.includeBusiness) {
    const b = opts.includeBusiness;
    const idx = businesses.findIndex((x) => x.id === b.id);
    businesses =
      idx >= 0 ? businesses.map((x, i) => (i === idx ? b : x)) : [...businesses, b];
  }

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
      contents: s.contents,
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
