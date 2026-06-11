"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/ui";
import { MetricsDashboard } from "@/components/metrics-dashboard";
import { useAiStatus } from "@/components/ai-status";
import { mockPerformance, analyzeContentPerformance } from "@/lib/metrics";

export default function MetricsPage() {
  const business = useStore((s) => s.businesses.find((b) => b.id === s.activeBusinessId) || null);
  const contents = useStore((s) => s.contents);
  const status = useAiStatus();

  const snapshot = useMemo(() => {
    if (!business) return null;
    const bizContents = contents.filter((c) => c.businessId === business.id);
    const perf = mockPerformance(business, bizContents);
    // Hoy siempre demo (no hay API de redes conectada).
    return analyzeContentPerformance(perf, true);
  }, [business, contents]);

  if (!business || !snapshot) return null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Métricas"
        subtitle="Cómo vienen funcionando tus contenidos y qué conviene hacer en el próximo calendario."
      />
      <MetricsDashboard snapshot={snapshot} />
    </div>
  );
}
