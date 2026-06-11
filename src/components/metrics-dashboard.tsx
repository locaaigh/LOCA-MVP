"use client";

import * as React from "react";
import { Badge, Card, SectionLabel } from "@/components/ui";
import { FORMAT_LABELS } from "@/lib/constants";
import type { MetricsSnapshot, PerformanceInsight } from "@/lib/types";
import {
  Eye,
  TrendingUp,
  Heart,
  Trophy,
  Sparkles,
  Repeat,
  Lightbulb,
  Ban,
  Wand2,
} from "lucide-react";

const INSIGHT_META: Record<PerformanceInsight["kind"], { icon: any; tone: string; label: string }> = {
  win: { icon: Trophy, tone: "text-emerald-600 bg-emerald-50", label: "Qué funcionó mejor" },
  repeat: { icon: Repeat, tone: "text-loca-600 bg-loca-50", label: "Qué conviene repetir" },
  learning: { icon: Lightbulb, tone: "text-amber-600 bg-amber-50", label: "Qué aprendió Eva" },
  avoid: { icon: Ban, tone: "text-red-600 bg-red-50", label: "Qué conviene evitar" },
  recommendation: { icon: Wand2, tone: "text-lima-700 bg-lima-50", label: "Recomendación para el próximo calendario" },
};

function fmt(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

export function MetricsDashboard({ snapshot }: { snapshot: MetricsSnapshot }) {
  const s = snapshot;
  return (
    <div className="space-y-5">
      {s.isDemo && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-2.5 text-sm text-amber-800">
          <Sparkles className="h-4 w-4" /> Datos demo — cuando conectes tus redes, Eva va a mostrar tus métricas reales acá.
        </div>
      )}

      {/* Totales */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={Eye} label="Alcance" value={fmt(s.totals.reach)} />
        <Stat icon={TrendingUp} label="Impresiones" value={fmt(s.totals.impressions)} />
        <Stat icon={Heart} label="Interacciones" value={fmt(s.totals.interactions)} />
        <Stat icon={Sparkles} label="Engagement" value={`${(s.totals.engagementRate * 100).toFixed(1)}%`} />
      </div>

      {/* Mejores */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Best label="Mejor canal" value={s.bestChannel} />
        <Best label="Mejor formato" value={s.bestFormat ? FORMAT_LABELS[s.bestFormat] || s.bestFormat : undefined} />
        <Best label="Mejor día" value={s.bestDay} />
        <Best label="Mejor contenido" value={s.bestContentTitle} />
      </div>

      {/* Insights didácticos */}
      <div>
        <SectionLabel>Lo que Eva aprendió</SectionLabel>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {s.insights.map((ins, i) => {
            const m = INSIGHT_META[ins.kind];
            return (
              <Card key={i} className="flex gap-3 p-4">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${m.tone}`}>
                  <m.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{m.label}</p>
                  <p className="font-semibold text-zinc-900">{ins.title}</p>
                  <p className="mt-0.5 text-sm text-zinc-600">{ins.detail}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Por canal */}
      {s.byChannel.length > 0 && (
        <Card>
          <SectionLabel>Por canal</SectionLabel>
          <div className="mt-3 space-y-2">
            {s.byChannel.map((c) => (
              <div key={c.channel} className="flex items-center gap-3">
                <Badge tone="pink">{c.channel}</Badge>
                <div className="flex-1">
                  <div className="h-2 rounded-full bg-zinc-100">
                    <div className="h-2 rounded-full bg-loca-500" style={{ width: `${Math.min(100, c.engagementRate * 600)}%` }} />
                  </div>
                </div>
                <span className="w-28 text-right text-xs text-zinc-500">
                  {fmt(c.reach)} alcance · {(c.engagementRate * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Top contenido */}
      {s.topContent.length > 0 && (
        <Card>
          <SectionLabel>Top contenidos</SectionLabel>
          <div className="mt-3 space-y-2">
            {s.topContent.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3 py-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="text-zinc-300">#{i + 1}</span>
                  <span className="truncate font-medium text-zinc-700">{c.title}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-zinc-400">
                  <Badge>{c.channel}</Badge>
                  {(c.engagementRate * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card className="p-4">
      <Icon className="h-4 w-4 text-loca-400" />
      <div className="mt-2 text-2xl font-bold text-zinc-900">{value}</div>
      <div className="text-xs text-zinc-500">{label}</div>
    </Card>
  );
}

function Best({ label, value }: { label: string; value?: string }) {
  return (
    <Card className="p-4">
      <SectionLabel>{label}</SectionLabel>
      <p className="mt-1 font-semibold text-zinc-900">{value || "—"}</p>
    </Card>
  );
}
