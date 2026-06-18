"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useGenerators } from "@/lib/generators";
import { Badge, Button, Card, EvaLoading, PageHeader, SectionLabel, useToast } from "@/components/ui";
import { PlatformLogo } from "@/components/platform-logo";
import { copyToClipboard } from "@/lib/utils";
import { RefreshCw, Copy } from "lucide-react";

export default function AdsPage() {
  const business = useStore((s) => s.businesses.find((b) => b.id === s.activeBusinessId) || null);
  const adStrategies = useStore((s) => s.adStrategies);
  const gen = useGenerators();
  const { show, node } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  if (!business) return null;

  const meta = adStrategies.find((a) => a.businessId === business.id && a.platform === "meta")?.meta;
  const google = adStrategies.find((a) => a.businessId === business.id && a.platform === "google")?.google;

  async function generate(platform: "meta" | "google") {
    setLoading(platform);
    try {
      const m = await gen.generateAds(business!, platform);
      show(m?.warning || `Estrategia de ${platform === "meta" ? "Meta" : "Google"} Ads lista 📣`);
    } catch (e: any) {
      show(e?.message || "Error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-8">
      {node}
      <PageHeader
        title="Ads"
        subtitle={`Estrategia de anuncios para ${business.name}. No se publican campañas reales.`}
      />

      {/* Meta */}
      <Card className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <PlatformLogo channel="Instagram" size={44} />
            <div>
              <h2 className="text-xl font-bold tracking-tight text-zinc-900">Meta Ads</h2>
              <p className="text-sm text-zinc-500">Facebook e Instagram</p>
            </div>
          </div>
          <Button size="lg" onClick={() => generate("meta")} loading={loading === "meta"}>
            {meta ? <RefreshCw className="h-4 w-4" /> : null}
            {meta ? "Modificar" : "Generar estrategia Meta"}
          </Button>
        </div>
        {loading === "meta" && !meta && <EvaLoading text="Eva está armando tu estrategia de Meta…" />}
        {meta && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Info label="Objetivo de campaña" value={meta.campaignObjective} />
            <Info label="Etapa del funnel" value={meta.funnelStage} />
            <Info label="Destino recomendado" value={meta.destination} />
            <Info label="Presupuesto" value={meta.budgetRecommendation} />
            <ListInfo label="Audiencias" items={meta.audiences} />
            <ListInfo label="Intereses / comportamientos" items={meta.interests} />
            <ListInfo label="Ángulos de anuncio" items={meta.adAngles} />
            <ListInfo label="Sugerencias creativas" items={meta.creativeSuggestions} />
            <CopyList label="Variantes de copy" items={meta.copyVariants} onCopy={show} />
            <CopyList label="Headlines" items={meta.headlines} onCopy={show} />
            <div className="rounded-2xl border border-zinc-200/70 bg-white p-4 sm:col-span-2">
              <SectionLabel>CTAs</SectionLabel>
              <div className="mt-2 flex flex-wrap gap-2">
                {meta.ctas.map((cta) => (
                  <Badge key={cta} tone="lima">{cta}</Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Google */}
      <Card className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <PlatformLogo channel="Google" size={44} />
            <div>
              <h2 className="text-xl font-bold tracking-tight text-zinc-900">Google Ads</h2>
              <p className="text-sm text-zinc-500">Búsqueda y display</p>
            </div>
          </div>
          <Button size="lg" onClick={() => generate("google")} loading={loading === "google"}>
            {google ? <RefreshCw className="h-4 w-4" /> : null}
            {google ? "Modificar" : "Generar estrategia Google"}
          </Button>
        </div>
        {loading === "google" && !google && <EvaLoading text="Eva está armando tu estrategia de Google…" />}
        {google && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Info label="Tipo de campaña" value={google.campaignType} />
            <Info label="Intención de búsqueda" value={google.searchIntent} />
            <Info label="Landing sugerida" value={google.landingSuggestion} />
            <Info label="Presupuesto" value={google.budgetRecommendation} />
            <ListInfo label="Keywords" items={google.keywords} />
            <ListInfo label="Negative keywords" items={google.negativeKeywords} />
            <CopyList label="Variantes de copy" items={google.copyVariants} onCopy={show} />
          </div>
        )}
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200/70 bg-zinc-50/60 p-4">
      <SectionLabel>{label}</SectionLabel>
      <p className="mt-1 text-[15px] font-semibold text-zinc-800">{value}</p>
    </div>
  );
}
function ListInfo({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-zinc-200/70 bg-zinc-50/60 p-4">
      <SectionLabel>{label}</SectionLabel>
      <ul className="mt-2 space-y-1.5 text-sm text-zinc-700">
        {items.map((i, idx) => (
          <li key={idx} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-loca-400" />{i}</li>
        ))}
      </ul>
    </div>
  );
}
function CopyList({ label, items, onCopy }: { label: string; items: string[]; onCopy: (m: string) => void }) {
  return (
    <div className="rounded-2xl border border-zinc-200/70 bg-zinc-50/60 p-4">
      <SectionLabel>{label}</SectionLabel>
      <div className="mt-2 space-y-2">
        {items.map((i, idx) => (
          <div key={idx} className="group flex items-start justify-between gap-2 rounded-xl border border-zinc-200/70 bg-white p-3 text-sm shadow-sm transition hover:border-loca-200">
            <span className="text-zinc-700">{i}</span>
            <button
              onClick={async () => onCopy((await copyToClipboard(i)) ? "Copiado" : "No se pudo copiar")}
              className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition hover:bg-loca-50 hover:text-loca-600"
              aria-label="Copiar"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
