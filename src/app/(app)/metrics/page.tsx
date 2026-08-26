"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/ui";
import { MetricsDashboard } from "@/components/metrics-dashboard";
import { api } from "@/lib/api";
import { mockPerformance, analyzeContentPerformance, performanceFromMedia } from "@/lib/metrics";
import type { ContentPerformance, MetricsSnapshot } from "@/lib/types";

export default function MetricsPage() {
  const business = useStore((s) => s.businesses.find((b) => b.id === s.activeBusinessId) || null);
  const contents = useStore((s) => s.contents);
  const user = useStore((s) => s.user);

  const isDemo = !!user?.isDemo || !!business?.isDemo;

  // Fallback demo estable (mismo comportamiento previo): se usa mientras cargan
  // los datos reales, cuando no hay piezas publicadas con métricas, o cuando
  // no hay una conexión de redes activa.
  const demoSnapshot = useMemo<MetricsSnapshot | null>(() => {
    if (!business) return null;
    const bizContents = contents.filter((c) => c.businessId === business.id);
    return analyzeContentPerformance(mockPerformance(business, bizContents), true);
  }, [business, contents]);

  const [snapshot, setSnapshot] = useState<MetricsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!business) return;
      setLoading(true);

      // Piezas realmente publicadas en la red, con id de media para consultar
      // sus insights. En modo demo no consultamos la API real.
      const published = isDemo
        ? []
        : contents.filter(
            (c) => c.businessId === business.id && c.status === "published" && c.publishedMediaId
          );

      if (published.length === 0) {
        if (!cancelled) {
          setSnapshot(demoSnapshot);
          setLoading(false);
        }
        return;
      }

      // Un insight por publicación; los que fallen (post de FB, permiso, etc.)
      // se descartan sin romper el resto.
      const results = await Promise.allSettled(
        published.map((c) =>
          api.metaInsights(business.id, c.publishedMediaId!).then((r) => ({ content: c, media: r.media }))
        )
      );

      const perfs: ContentPerformance[] = [];
      for (const r of results) {
        if (r.status === "fulfilled" && r.value.media) {
          perfs.push(performanceFromMedia(r.value.content, r.value.media));
        }
      }

      if (!cancelled) {
        // Con al menos una métrica real mostramos datos reales; si no, demo.
        setSnapshot(perfs.length ? analyzeContentPerformance(perfs, false) : demoSnapshot);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [business, contents, isDemo, demoSnapshot]);

  if (!business) return null;
  const shown = snapshot ?? demoSnapshot;
  if (!shown) return null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Métricas"
        subtitle="Cómo vienen funcionando tus contenidos y qué conviene hacer en el próximo calendario."
      />
      {loading ? (
        <p className="text-sm text-faint">Cargando métricas…</p>
      ) : (
        <MetricsDashboard snapshot={shown} />
      )}
    </div>
  );
}
