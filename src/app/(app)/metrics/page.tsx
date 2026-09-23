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
  // Aviso no bloqueante cuando alguna pieza no pudo traer sus métricas (permiso,
  // métrica deprecada, etc.). Antes se descartaba en silencio.
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!business) return;
      setLoading(true);
      setLoadError(null);

      // Piezas realmente publicadas en una red de Meta (IG/FB), con id de media
      // para consultar sus insights. En modo demo no consultamos la API real.
      // El canal define si el mediaId es un post de FB o un media de IG.
      const metaPlatform = (c: (typeof contents)[number]): "facebook" | "instagram" | null => {
        const p = c.publishedPlatform || c.channel;
        if (p === "Facebook") return "facebook";
        if (p === "Instagram") return "instagram";
        return null; // LinkedIn / TikTok: no se consultan por este endpoint
      };
      const published = isDemo
        ? []
        : contents.filter(
            (c) =>
              c.businessId === business.id &&
              c.status === "published" &&
              c.publishedMediaId &&
              metaPlatform(c) !== null
          );

      if (published.length === 0) {
        if (!cancelled) {
          setSnapshot(demoSnapshot);
          setLoading(false);
        }
        return;
      }

      // Un insight por publicación, ruteando FB vs IG según el canal. Los que
      // fallen se cuentan para avisar al usuario, sin romper el resto.
      const results = await Promise.allSettled(
        published.map((c) =>
          api
            .metaInsights(business.id, c.publishedMediaId!, metaPlatform(c)!)
            .then((r) => ({ content: c, media: r.media }))
        )
      );

      const perfs: ContentPerformance[] = [];
      let failed = 0;
      for (const r of results) {
        if (r.status === "fulfilled" && r.value.media) {
          perfs.push(performanceFromMedia(r.value.content, r.value.media));
        } else {
          failed++;
        }
      }

      if (!cancelled) {
        // Con al menos una métrica real mostramos datos reales; si no, demo.
        setSnapshot(perfs.length ? analyzeContentPerformance(perfs, false) : demoSnapshot);
        if (failed > 0) {
          setLoadError(
            `No pudimos traer las métricas de ${failed} ${failed === 1 ? "publicación" : "publicaciones"}. ` +
              "Puede ser un permiso pendiente en la conexión (reconectá tus redes en Configuración) o que la red aún no tenga datos."
          );
        }
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
      {loadError && !loading && (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          {loadError}
        </div>
      )}
      {loading ? (
        <p className="text-sm text-faint">Cargando métricas…</p>
      ) : (
        <MetricsDashboard snapshot={shown} />
      )}
    </div>
  );
}
