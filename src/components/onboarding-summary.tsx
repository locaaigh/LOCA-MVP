"use client";

import * as React from "react";
import { Badge, Button, Card, SectionLabel } from "@/components/ui";
import type { Business } from "@/lib/types";
import {
  ShoppingBag,
  Users,
  Heart,
  MessageCircle,
  Palette,
  Share2,
  Target,
  AlertCircle,
  Sparkles,
  Pencil,
} from "lucide-react";

// Campos críticos que deben estar para generar una buena estrategia.
function missingCritical(b: Business): string[] {
  const m: string[] = [];
  if (!b.name?.trim()) m.push("Nombre del negocio");
  if (!b.industry) m.push("Industria");
  if (!b.shortDescription?.trim()) m.push("Descripción corta");
  if (!b.competitiveAdvantages?.length) m.push("Ventaja competitiva");
  if (!b.goals?.primaryContentGoal) m.push("Objetivo principal");
  return m;
}

export function OnboardingSummary({
  business,
  onConfirm,
  onEdit,
}: {
  business: Business;
  onConfirm: () => void;
  onEdit: () => void;
}) {
  const b = business;
  const bk = b.brandKit;
  const bi = b.businessIntelligence;
  const missing = missingCritical(b);
  const confidence = bi?.analysisConfidence ? Math.round(bi.analysisConfidence * 100) : null;

  const channels = [
    ...(bi?.socialLinks?.map((s) => s.platform) || []),
    ...b.marketingChannels,
  ].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-loca-50 text-loca-600">
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 className="mt-3 text-2xl font-bold tracking-tight">Eva entendió esto de tu marca</h2>
        <p className="mt-1 text-sm text-zinc-500">Revisalo. Si algo no te cierra, podés editarlo.</p>
        {confidence != null && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-loca-50 px-3 py-1 text-sm font-medium text-loca-700">
            Eva pudo entender tu negocio en un {confidence}%
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryCard icon={ShoppingBag} title="Qué vende">
          {b.shortDescription || b.fullDescription || `${b.industry || "Tu negocio"}${b.subcategory ? ` · ${b.subcategory}` : ""}`}
        </SummaryCard>

        <SummaryCard icon={Users} title="A quién le vende">
          {b.audience?.segments?.length
            ? b.audience.segments.join(", ")
            : b.audience?.ageRanges?.length
              ? `Personas de ${b.audience.ageRanges.join(", ")}`
              : "Audiencia por definir — completala para afinar el contenido."}
        </SummaryCard>

        <SummaryCard icon={Heart} title="Por qué la elegirían">
          {bi?.valuePropositions?.length ? (
            <ul className="space-y-0.5">
              {bi.valuePropositions.slice(0, 4).map((v, i) => (
                <li key={i}>• {v.text}</li>
              ))}
            </ul>
          ) : b.competitiveAdvantages?.length ? (
            b.competitiveAdvantages.join(", ")
          ) : (
            "Sumá una ventaja competitiva para que Eva lo destaque."
          )}
        </SummaryCard>

        <SummaryCard icon={MessageCircle} title="Cómo debería hablar">
          {bk?.voiceTone?.toneTags?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {bk.voiceTone.toneTags.map((t) => (
                <Badge key={t} tone="pink">{t}</Badge>
              ))}
            </div>
          ) : (
            "Tono por definir."
          )}
        </SummaryCard>

        <SummaryCard icon={Palette} title="Identidad visual">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {(bk?.colors?.palette || []).slice(0, 6).map((c, i) => (
                <span key={i} className="h-6 w-6 rounded-full border border-zinc-200" style={{ backgroundColor: c.hex }} title={`${c.name} ${c.hex}`} />
              ))}
              {!bk?.colors?.palette?.length && <span className="text-zinc-400">Sin colores detectados.</span>}
            </div>
            {bk?.typography?.heading?.family && (
              <p className="text-xs text-zinc-500">Tipografía: {bk.typography.heading.family}</p>
            )}
          </div>
        </SummaryCard>

        <SummaryCard icon={Share2} title="Canales detectados">
          {channels.length ? (
            <div className="flex flex-wrap gap-1.5">
              {channels.map((c) => (
                <Badge key={c}>{c}</Badge>
              ))}
            </div>
          ) : (
            "Sin canales detectados."
          )}
        </SummaryCard>
      </div>

      {/* Objetivo recomendado */}
      {bi?.recommendedGoal?.goal && (
        <Card className="bg-lima-50/60">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-lima-600">
              <Target className="h-4 w-4" />
            </div>
            <div>
              <SectionLabel>Objetivo recomendado</SectionLabel>
              <p className="mt-0.5 font-semibold text-zinc-900">{bi.recommendedGoal.goal}</p>
              <p className="text-sm text-zinc-500">{bi.recommendedGoal.reason}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Faltantes */}
      {missing.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/60">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-800">Te faltan algunos datos clave</p>
              <p className="text-sm text-amber-700">
                Para que Eva genere una buena estrategia, completá: {missing.join(", ")}.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Acciones */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          variant="success"
          size="xl"
          className="flex-1"
          disabled={missing.length > 0}
          onClick={onConfirm}
        >
          <Sparkles className="h-5 w-5" /> Confirmar y generar estrategia
        </Button>
        <Button variant="outline" size="xl" onClick={onEdit}>
          <Pencil className="h-4 w-4" /> Editar datos
        </Button>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <Card className="space-y-2">
      <div className="flex items-center gap-2 text-zinc-500">
        <Icon className="h-4 w-4" />
        <SectionLabel>{title}</SectionLabel>
      </div>
      <div className="text-sm leading-relaxed text-zinc-700">{children}</div>
    </Card>
  );
}

export { missingCritical };
