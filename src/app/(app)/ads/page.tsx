"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useGenerators } from "@/lib/generators";
import { Badge, Button, Card, EvaLoading, PageHeader, useToast } from "@/components/ui";
import { copyToClipboard } from "@/lib/utils";
import { Megaphone, RefreshCw, Copy } from "lucide-react";

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
    <div className="space-y-6">
      {node}
      <PageHeader
        title="Ads"
        subtitle={`Estrategia de anuncios para ${business.name}. No se publican campañas reales.`}
      />

      {/* Meta */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-loca-600" />
            <h2 className="text-lg font-semibold">Meta Ads (Facebook / Instagram)</h2>
          </div>
          <Button onClick={() => generate("meta")} loading={loading === "meta"}>
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
            <div className="sm:col-span-2">
              <p className="mb-1 text-xs font-medium uppercase text-zinc-400">CTAs</p>
              <div className="flex flex-wrap gap-2">
                {meta.ctas.map((cta) => (
                  <Badge key={cta} tone="lima">{cta}</Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Google */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-lima-600" />
            <h2 className="text-lg font-semibold">Google Ads</h2>
          </div>
          <Button onClick={() => generate("google")} loading={loading === "google"}>
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
    <div className="rounded-lg bg-zinc-50 p-3">
      <p className="text-xs font-medium uppercase text-zinc-400">{label}</p>
      <p className="mt-0.5 text-sm text-zinc-700">{value}</p>
    </div>
  );
}
function ListInfo({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-3">
      <p className="text-xs font-medium uppercase text-zinc-400">{label}</p>
      <ul className="mt-1 space-y-1 text-sm text-zinc-700">
        {items.map((i, idx) => (
          <li key={idx} className="flex gap-1.5"><span className="text-loca-500">•</span>{i}</li>
        ))}
      </ul>
    </div>
  );
}
function CopyList({ label, items, onCopy }: { label: string; items: string[]; onCopy: (m: string) => void }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-3">
      <p className="text-xs font-medium uppercase text-zinc-400">{label}</p>
      <div className="mt-1 space-y-2">
        {items.map((i, idx) => (
          <div key={idx} className="flex items-start justify-between gap-2 rounded-md bg-white p-2 text-sm">
            <span className="text-zinc-700">{i}</span>
            <button
              onClick={async () => onCopy((await copyToClipboard(i)) ? "Copiado" : "No se pudo copiar")}
              className="shrink-0 text-zinc-400 hover:text-loca-600"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
