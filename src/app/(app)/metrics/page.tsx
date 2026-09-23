"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Button, Card, PageHeader } from "@/components/ui";
import { MetricsDashboard } from "@/components/metrics-dashboard";
import { api } from "@/lib/api";
import { analyzeContentPerformance, performanceFromMedia } from "@/lib/metrics";
import type { ContentItem, ContentPerformance, MetricsSnapshot } from "@/lib/types";
import { BarChart3, Link2, AlertTriangle } from "lucide-react";

type ConnState = "checking" | "none" | "connected";
type MetaPlatform = "facebook" | "instagram";
// Un media publicado a consultar: pieza + su id de media en UNA red.
type MediaTarget = { content: ContentItem; mediaId: string; platform: MetaPlatform };

function toMetaPlatform(channel?: string): MetaPlatform | null {
  if (channel === "Facebook") return "facebook";
  if (channel === "Instagram") return "instagram";
  return null; // LinkedIn/TikTok no se consultan por este endpoint
}

const CHANNEL_LABEL: Record<MetaPlatform, "Facebook" | "Instagram"> = {
  facebook: "Facebook",
  instagram: "Instagram",
};

/**
 * Media a consultar por cada pieza publicada. Con crosspost, una pieza tiene un
 * media por plataforma (publishResults); si no hay ese detalle (piezas viejas),
 * cae a los campos "singular" de la plataforma principal.
 */
function mediaTargetsFor(contents: ContentItem[], businessId: string): MediaTarget[] {
  const out: MediaTarget[] = [];
  for (const c of contents) {
    if (c.businessId !== businessId || c.status !== "published") continue;
    if (c.publishResults?.length) {
      for (const r of c.publishResults) {
        if (r.status !== "published" || !r.mediaId) continue;
        const p = toMetaPlatform(r.platform);
        if (p) out.push({ content: c, mediaId: r.mediaId, platform: p });
      }
    } else if (c.publishedMediaId) {
      const p = toMetaPlatform(c.publishedPlatform || c.channel);
      if (p) out.push({ content: c, mediaId: c.publishedMediaId, platform: p });
    }
  }
  return out;
}

export default function MetricsPage() {
  const business = useStore((s) => s.businesses.find((b) => b.id === s.activeBusinessId) || null);
  const contents = useStore((s) => s.contents);

  const [connState, setConnState] = useState<ConnState>("checking");
  const [snapshot, setSnapshot] = useState<MetricsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!business) return;
      setLoading(true);
      setLoadError(null);
      setSnapshot(null);

      // 1. ¿El negocio tiene una conexión de Meta o Instagram activa? Sin
      // conexión no hay métricas reales que mostrar (no usamos datos demo).
      let connected = false;
      try {
        const [meta, ig] = await Promise.all([
          fetch(`/api/integrations/meta/connection?businessId=${encodeURIComponent(business.id)}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
          fetch(`/api/integrations/instagram/connection?businessId=${encodeURIComponent(business.id)}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ]);
        connected =
          meta?.connection?.status === "active" || ig?.connection?.status === "active";
      } catch {
        connected = false;
      }
      if (cancelled) return;
      setConnState(connected ? "connected" : "none");
      if (!connected) {
        setLoading(false);
        return;
      }

      // 2. Media publicados en Meta (IG/FB). Con crosspost, una pieza aporta un
      // media por red; así una pieza en IG y FB muestra las métricas de ambas.
      const targets = mediaTargetsFor(contents, business.id);

      if (targets.length === 0) {
        if (!cancelled) setLoading(false);
        return;
      }

      // 3. Un insight por media, ruteando FB vs IG según su plataforma.
      const results = await Promise.allSettled(
        targets.map((t) =>
          api
            .metaInsights(business.id, t.mediaId, t.platform)
            .then((r) => ({ target: t, media: r.media }))
        )
      );

      const perfs: ContentPerformance[] = [];
      const errs = new Set<string>();
      for (const r of results) {
        if (r.status === "fulfilled" && r.value.media) {
          const { content, platform } = r.value.target;
          // El canal de esta métrica es la red concreta del media (no la principal).
          const perf = performanceFromMedia(
            { ...content, publishedPlatform: CHANNEL_LABEL[platform] },
            r.value.media
          );
          perf.id = `perf_${content.id}_${platform}`;
          perfs.push(perf);
        } else if (r.status === "rejected") {
          errs.add(String(r.reason?.message || r.reason));
        }
      }

      if (cancelled) return;
      setSnapshot(perfs.length ? analyzeContentPerformance(perfs, false) : null);
      if (errs.size > 0) {
        // Log técnico para diagnóstico + mensaje visible al usuario.
        console.error("[metrics] fallos al traer insights:", [...errs]);
        setLoadError([...errs].join(" · "));
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [business, contents]);

  if (!business) return null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Métricas"
        subtitle="Cómo vienen funcionando tus contenidos y qué conviene hacer en el próximo calendario."
      />

      {loading ? (
        <p className="text-sm text-faint">Cargando métricas…</p>
      ) : connState === "none" ? (
        <ConnectFirst />
      ) : !snapshot && loadError ? (
        <MetricsError detail={loadError} />
      ) : !snapshot ? (
        <NoPublishedYet />
      ) : (
        <>
          {loadError && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200/80 bg-amber-50/70 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Algunas publicaciones no trajeron métricas. Puede ser un permiso
                pendiente (reconectá tus redes) o que aún no tengan datos.
              </span>
            </div>
          )}
          <MetricsDashboard snapshot={snapshot} />
        </>
      )}
    </div>
  );
}

// ── Estados vacíos ────────────────────────────────────────────

function ConnectFirst() {
  return (
    <Card className="flex flex-col items-center gap-4 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-subtle-bg text-accent">
        <Link2 className="h-7 w-7" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-bold tracking-tight text-foreground">
          Conectá tus redes sociales
        </h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Para ver las métricas reales de tus publicaciones en Facebook e
          Instagram, primero conectá tus cuentas desde Configuración.
        </p>
      </div>
      <Button size="lg" onClick={() => (window.location.href = "/settings")}>
        <Link2 className="h-4 w-4" /> Conectar mis redes
      </Button>
    </Card>
  );
}

function NoPublishedYet() {
  return (
    <Card className="flex flex-col items-center gap-4 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-muted text-muted-foreground">
        <BarChart3 className="h-7 w-7" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-bold tracking-tight text-foreground">
          Todavía no hay métricas
        </h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Cuando publiques contenido en tus redes desde LOCA, acá vas a ver el
          alcance, las interacciones y el engagement de cada publicación.
        </p>
      </div>
    </Card>
  );
}

function MetricsError({ detail }: { detail: string }) {
  return (
    <Card className="flex flex-col items-center gap-4 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-bold tracking-tight text-foreground">
          No pudimos traer tus métricas
        </h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Suele ser un permiso pendiente en la conexión. Probá reconectar tus
          redes desde Configuración; si sigue igual, avisanos.
        </p>
        <p className="mx-auto max-w-md pt-1 text-xs text-faint break-words">{detail}</p>
      </div>
      <Button size="lg" variant="outline" onClick={() => (window.location.href = "/settings")}>
        <Link2 className="h-4 w-4" /> Ir a Configuración
      </Button>
    </Card>
  );
}
