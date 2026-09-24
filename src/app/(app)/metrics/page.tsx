"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Button, Card, PageHeader, SectionLabel } from "@/components/ui";
import { PlatformLogo } from "@/components/platform-logo";
import { MetricsPlatformView } from "@/components/metrics-platform-view";
import { api } from "@/lib/api";
import type { MetricsPeriod, MetricsResponse, PlatformId } from "@/lib/metrics/types";
import { Link2, Users, Eye, Heart, FileText } from "lucide-react";

const PLATFORM_LABEL: Record<PlatformId, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
};

function fmt(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

export default function MetricsPage() {
  const business = useStore((s) => s.businesses.find((b) => b.id === s.activeBusinessId) || null);

  const [period, setPeriod] = useState<MetricsPeriod>("30d");
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PlatformId | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!business) return;
      setLoading(true);
      setError(null);
      try {
        const res = await api.metrics(business.id, period);
        if (cancelled) return;
        setData(res);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "No se pudieron cargar las métricas");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [business, period]);

  // Solo las plataformas conectadas (no mostramos las que no conectó).
  const connected = useMemo(
    () => (data?.platforms || []).filter((p) => p.status !== "not_connected"),
    [data]
  );

  // Tab por defecto: la primera con datos, si no la primera conectada.
  useEffect(() => {
    if (!connected.length) {
      setActiveTab(null);
      return;
    }
    setActiveTab((prev) => {
      if (prev && connected.some((p) => p.platform === prev)) return prev;
      return (connected.find((p) => p.status === "ok") || connected[0]).platform;
    });
  }, [connected]);

  if (!business) return null;

  const activeData = connected.find((p) => p.platform === activeTab) || null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Métricas"
          subtitle="Cómo vienen funcionando tus contenidos y qué conviene hacer en el próximo calendario."
        />
        <PeriodSelector period={period} onChange={setPeriod} />
      </div>

      {loading ? (
        <p className="text-sm text-faint">Cargando métricas…</p>
      ) : error ? (
        <Card className="flex flex-col items-center gap-4 py-14 text-center">
          <h2 className="text-lg font-bold tracking-tight text-foreground">No pudimos cargar las métricas</h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">{error}</p>
        </Card>
      ) : connected.length === 0 ? (
        <ConnectFirst />
      ) : (
        <>
          {/* Tabs por plataforma */}
          <div className="flex flex-wrap gap-2 border-b border-border/60 pb-3">
            {connected.map((p) => {
              const isActive = p.platform === activeTab;
              const isSoon = p.status === "coming_soon";
              return (
                <button
                  key={p.platform}
                  type="button"
                  onClick={() => setActiveTab(p.platform)}
                  className={
                    "inline-flex items-center gap-2 rounded-2xl px-3.5 py-2 text-sm font-semibold transition " +
                    (isActive
                      ? "bg-accent-subtle-bg text-accent ring-1 ring-inset ring-accent-subtle-ring"
                      : "text-muted-foreground hover:bg-surface-muted")
                  }
                >
                  <PlatformLogo channel={PLATFORM_LABEL[p.platform]} size={20} />
                  {PLATFORM_LABEL[p.platform]}
                  {isSoon && <span className="text-[11px] font-medium text-faint">Próximamente</span>}
                </button>
              );
            })}
          </div>

          {/* Sección de la plataforma activa */}
          {activeData && <MetricsPlatformView data={activeData} />}

          {/* Resumen general */}
          {data && data.summary.includedPlatforms.length > 0 && (
            <GeneralSummary summary={data.summary} />
          )}
        </>
      )}
    </div>
  );
}

function PeriodSelector({
  period,
  onChange,
}: {
  period: MetricsPeriod;
  onChange: (p: MetricsPeriod) => void;
}) {
  const opts: { id: MetricsPeriod; label: string }[] = [
    { id: "7d", label: "7 días" },
    { id: "30d", label: "30 días" },
  ];
  return (
    <div className="inline-flex rounded-2xl border border-border bg-card p-1">
      {opts.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={
            "rounded-xl px-3.5 py-1.5 text-sm font-semibold transition " +
            (period === o.id ? "bg-accent-subtle-bg text-accent" : "text-muted-foreground hover:text-foreground")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function GeneralSummary({ summary }: { summary: MetricsResponse["summary"] }) {
  const names = summary.includedPlatforms.map((p) => PLATFORM_LABEL[p]).join(" + ");
  return (
    <Card className="bg-gradient-to-br from-loca-50 to-card ring-1 ring-accent-subtle-ring dark:from-accent-subtle-bg">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>Resumen general</SectionLabel>
        <span className="text-xs font-medium text-muted-foreground">Incluye: {names}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryStat icon={Users} label="Seguidores" value={fmt(summary.followers)} />
        <SummaryStat icon={Eye} label="Vistas" value={fmt(summary.views)} />
        <SummaryStat icon={Heart} label="Interacciones" value={fmt(summary.interactions)} />
        <SummaryStat icon={FileText} label="Publicaciones" value={fmt(summary.postsCount)} />
      </div>
      <p className="mt-3 text-xs text-faint">
        Suma solo métricas comparables entre las plataformas conectadas. El alcance no se
        suma entre redes porque no es equivalente.
      </p>
    </Card>
  );
}

function SummaryStat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="mt-1 text-2xl font-bold tracking-tight text-foreground">{value}</div>
    </div>
  );
}

function ConnectFirst() {
  return (
    <Card className="flex flex-col items-center gap-4 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-subtle-bg text-accent">
        <Link2 className="h-7 w-7" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-bold tracking-tight text-foreground">Conectá tus redes sociales</h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Para ver las métricas reales de tus publicaciones en Instagram y Facebook, primero
          conectá tus cuentas desde Configuración.
        </p>
      </div>
      <Button size="lg" onClick={() => (window.location.href = "/settings")}>
        <Link2 className="h-4 w-4" /> Conectar mis redes
      </Button>
    </Card>
  );
}
