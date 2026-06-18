"use client";

import * as React from "react";
import { Badge, Card, SectionLabel } from "@/components/ui";
import { PlatformLogo } from "@/components/platform-logo";
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
    <div className="space-y-8">
      {s.isDemo && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200/80 bg-amber-50/70 px-4 py-3 text-sm font-medium text-amber-800">
          <Sparkles className="h-4 w-4 shrink-0" /> Datos demo — cuando conectes tus redes, Eva va a mostrar tus métricas reales acá.
        </div>
      )}

      {/* Totales */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat icon={Eye} label="Alcance" value={fmt(s.totals.reach)} />
        <Stat icon={TrendingUp} label="Impresiones" value={fmt(s.totals.impressions)} />
        <Stat icon={Heart} label="Interacciones" value={fmt(s.totals.interactions)} />
        <Stat icon={Sparkles} label="Engagement" value={`${(s.totals.engagementRate * 100).toFixed(1)}%`} highlight />
      </div>

      {/* Mejores */}
      <div>
        <SectionLabel>Lo mejor del período</SectionLabel>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Best label="Mejor canal" value={s.bestChannel} />
          <Best label="Mejor formato" value={s.bestFormat ? FORMAT_LABELS[s.bestFormat] || s.bestFormat : undefined} />
          <Best label="Mejor día" value={s.bestDay} />
          <Best label="Mejor contenido" value={s.bestContentTitle} />
        </div>
      </div>

      {/* Insights didácticos */}
      <div>
        <SectionLabel>Lo que Eva aprendió</SectionLabel>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {s.insights.map((ins, i) => {
            const m = INSIGHT_META[ins.kind];
            return (
              <Card key={i} className="flex gap-4 p-5 shadow-card transition hover:shadow-pop">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${m.tone}`}>
                  <m.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{m.label}</p>
                  <p className="mt-0.5 text-[15px] font-bold tracking-tight text-zinc-900">{ins.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-600">{ins.detail}</p>
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
          <div className="mt-4 space-y-4">
            {s.byChannel.map((c) => (
              <div key={c.channel} className="flex items-center gap-3">
                <span className="flex w-32 shrink-0 items-center gap-2">
                  <PlatformLogo channel={c.channel} size={28} />
                  <span className="truncate text-sm font-semibold text-zinc-700">{c.channel}</span>
                </span>
                <div className="flex-1">
                  <div className="h-2.5 rounded-full bg-zinc-100">
                    <div className="h-2.5 rounded-full bg-gradient-to-r from-loca-400 to-loca-600" style={{ width: `${Math.min(100, c.engagementRate * 600)}%` }} />
                  </div>
                </div>
                <span className="w-32 text-right text-xs font-medium text-zinc-500">
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
          <div className="mt-4 space-y-2.5">
            {s.topContent.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200/70 px-4 py-3 text-sm transition hover:border-loca-200 hover:bg-loca-50/40">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-500">{i + 1}</span>
                  <span className="truncate font-semibold text-zinc-800">{c.title}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2.5 text-xs text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <PlatformLogo channel={c.channel} size={22} />
                    <span className="hidden font-medium text-zinc-500 sm:inline">{c.channel}</span>
                  </span>
                  <span className="font-bold text-loca-600">{(c.engagementRate * 100).toFixed(1)}%</span>
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, highlight }: { icon: any; label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={`p-5 transition hover:shadow-pop ${highlight ? "bg-gradient-to-br from-loca-50 to-white ring-1 ring-loca-100" : ""}`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${highlight ? "bg-loca-100 text-loca-600" : "bg-loca-50 text-loca-500"}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className={`mt-4 text-3xl font-bold tracking-tight sm:text-4xl ${highlight ? "text-loca-600" : "text-zinc-900"}`}>{value}</div>
      <div className="mt-1 text-xs font-medium text-zinc-500">{label}</div>
    </Card>
  );
}

function Best({ label, value }: { label: string; value?: string }) {
  return (
    <Card className="p-5 transition hover:shadow-pop">
      <SectionLabel>{label}</SectionLabel>
      <p className="mt-2 text-lg font-bold tracking-tight text-zinc-900">{value || "—"}</p>
    </Card>
  );
}
