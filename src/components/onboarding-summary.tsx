"use client";

import * as React from "react";
import { Badge, Button, Card, SectionLabel } from "@/components/ui";
import { PlatformLogo } from "@/components/platform-logo";
import { missingCriticalLabels } from "@/lib/business-questions";
import type { Business } from "@/lib/types";
import {
  ShoppingBag,
  Package,
  Users,
  Heart,
  MessageCircle,
  Palette,
  Share2,
  Target,
  Phone,
  Ban,
  AlertCircle,
  Sparkles,
  Pencil,
  ArrowRight,
} from "lucide-react";

export type SummarySectionKey =
  | "basicos"
  | "productos"
  | "audiencia"
  | "propuesta"
  | "canales"
  | "objetivos"
  | "brandkit"
  | "comerciales"
  | "keywords";

// Calidad mínima para que Eva no genere una estrategia genérica.
// Fuente única de verdad: business-questions.ts (críticos).
function missingCritical(b: Business): string[] {
  return missingCriticalLabels(b);
}

export function OnboardingSummary({
  business,
  onConfirm,
  onEdit,
  onEditSection,
  onCompleteWithEva,
  onFixCritical,
}: {
  business: Business;
  onConfirm: () => void;
  onEdit: () => void;
  onEditSection: (key: SummarySectionKey) => void;
  onCompleteWithEva: () => void;
  onFixCritical?: () => void;
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

  const products = b.productsServices.filter((p) => p.name.trim());
  const contact = bi?.contactInfo;
  const hasContact = contact && (contact.whatsapp || contact.email || contact.phone || contact.address);

  // Faltantes obligatorios por sección (para resaltar en rojo)
  const miss = {
    basicos: !b.name?.trim() || !b.industry || !b.shortDescription?.trim(),
    propuesta: !b.competitiveAdvantages?.length,
    objetivos: !b.goals?.primaryContentGoal,
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-loca-500 to-loca-700 text-white shadow-lift animate-float">
          <Sparkles className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900">Eva entendió esto de tu marca</h2>
        <p className="mt-2 text-[15px] text-zinc-500">Revisalo y editá cualquier sección con el lápiz ✏️</p>
        {confidence != null && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-loca-50 px-3.5 py-1.5 text-sm font-semibold text-loca-700 ring-1 ring-loca-100">
            <Sparkles className="h-3.5 w-3.5" /> Eva entendió tu negocio en un {confidence}%
          </p>
        )}
      </div>

      {/* Pendientes: resumen accionable arriba */}
      {missing.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/60">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-800">
                  Te {missing.length === 1 ? "falta" : "faltan"} {missing.length}{" "}
                  {missing.length === 1 ? "dato" : "datos"} para generar la estrategia
                </p>
                <p className="text-sm text-amber-700">Completalos de a uno. Eva puede sugerir lo que se pueda sin inventar.</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              {onFixCritical && (
                <Button variant="primary" size="lg" onClick={onFixCritical}>
                  <ArrowRight className="h-4 w-4" /> Completar lo que falta
                </Button>
              )}
              <Button variant="outline" size="lg" onClick={onCompleteWithEva}>
                <Sparkles className="h-4 w-4" /> Que Eva sugiera
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryCard icon={ShoppingBag} title="Qué vende" onEdit={() => onEditSection("basicos")} danger={miss.basicos} onFix={onFixCritical}>
          {b.shortDescription || b.fullDescription || `${b.industry || "Tu negocio"}${b.subcategory ? ` · ${b.subcategory}` : ""}`}
        </SummaryCard>

        <SummaryCard icon={Package} title="Productos y servicios" onEdit={() => onEditSection("productos")}>
          {products.length ? products.map((p) => p.name).join(", ") : "Todavía no cargaste productos o servicios."}
        </SummaryCard>

        <SummaryCard icon={Users} title="A quién le vende" onEdit={() => onEditSection("audiencia")}>
          {b.audience?.segments?.length
            ? b.audience.segments.join(", ")
            : b.audience?.ageRanges?.length
              ? `Personas de ${b.audience.ageRanges.join(", ")}`
              : "Audiencia por definir."}
        </SummaryCard>

        <SummaryCard icon={Heart} title="Por qué la elegirían" onEdit={() => onEditSection("propuesta")} danger={miss.propuesta} onFix={onFixCritical}>
          {bi?.valuePropositions?.length ? (
            <ul className="space-y-0.5">
              {bi.valuePropositions.slice(0, 4).map((v, i) => (
                <li key={i}>• {v.text}</li>
              ))}
            </ul>
          ) : b.competitiveAdvantages?.length ? (
            b.competitiveAdvantages.join(", ")
          ) : (
            "Sumá una ventaja competitiva."
          )}
        </SummaryCard>

        <SummaryCard icon={MessageCircle} title="Cómo debería hablar" onEdit={() => onEditSection("brandkit")}>
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

        <SummaryCard icon={Palette} title="Identidad visual" onEdit={() => onEditSection("brandkit")}>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {(bk?.colors?.palette || []).slice(0, 6).map((c, i) => (
                <span key={i} className="h-6 w-6 rounded-full border border-zinc-200" style={{ backgroundColor: c.hex }} title={`${c.name} ${c.hex}`} />
              ))}
              {!bk?.colors?.palette?.length && <span className="text-zinc-400">Sin colores definidos.</span>}
            </div>
            {bk?.typography?.heading?.family && (
              <p className="text-xs text-zinc-500">Tipografía: {bk.typography.heading.family}</p>
            )}
          </div>
        </SummaryCard>

        <SummaryCard icon={Share2} title="Canales y marketing" onEdit={() => onEditSection("canales")}>
          {channels.length ? (
            <div className="flex flex-wrap items-center gap-2">
              {channels.map((c) => (
                <PlatformLogo key={c} channel={c} size={30} />
              ))}
            </div>
          ) : (
            "Sin canales detectados."
          )}
        </SummaryCard>

        <SummaryCard icon={Phone} title="Datos comerciales" onEdit={() => onEditSection("comerciales")}>
          {hasContact ? (
            <ul className="space-y-0.5 text-xs">
              {contact?.whatsapp && <li>WhatsApp: {contact.whatsapp}</li>}
              {contact?.email && <li>Email: {contact.email}</li>}
              {contact?.phone && <li>Tel: {contact.phone}</li>}
              {contact?.address && <li>{contact.address}</li>}
            </ul>
          ) : (
            "Sin datos comerciales detectados."
          )}
        </SummaryCard>

        <SummaryCard icon={Target} title="Objetivos" onEdit={() => onEditSection("objetivos")} danger={miss.objetivos} onFix={onFixCritical}>
          {bi?.recommendedGoal?.goal ? (
            <>
              <p className="font-medium text-zinc-800">{bi.recommendedGoal.goal}</p>
              <p className="text-xs text-zinc-500">{bi.recommendedGoal.reason}</p>
            </>
          ) : (
            b.goals?.marketingObjectives || "Objetivo por definir."
          )}
        </SummaryCard>

        <SummaryCard icon={Ban} title="Palabras clave y a evitar" onEdit={() => onEditSection("keywords")}>
          <div className="space-y-1">
            {bk?.brandKeywords?.length ? (
              <p className="text-xs text-zinc-600">Clave: {bk.brandKeywords.join(", ")}</p>
            ) : null}
            {bk?.avoidList?.length ? (
              <p className="text-xs text-red-500">Evitar: {bk.avoidList.join("; ")}</p>
            ) : (
              <p className="text-xs text-zinc-400">Sin restricciones definidas.</p>
            )}
          </div>
        </SummaryCard>
      </div>

      <p className="text-center text-xs text-zinc-400">
        Antes de generar la estrategia, confirmá que Eva entendió bien tu negocio.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="success" size="xl" className="flex-1" disabled={missing.length > 0} onClick={onConfirm}>
          <Sparkles className="h-5 w-5" /> Confirmar y generar estrategia
        </Button>
        <Button variant="outline" size="xl" onClick={onEdit}>
          <Pencil className="h-4 w-4" /> Editar todo
        </Button>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  title,
  onEdit,
  onFix,
  danger,
  children,
}: {
  icon: any;
  title: string;
  onEdit?: () => void;
  onFix?: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className={`space-y-2 ${danger ? "border-red-300 bg-red-50/40 shadow-[0_0_0_3px_rgba(239,68,68,0.08)]" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <div className={`flex items-center gap-2 ${danger ? "text-red-500" : "text-zinc-500"}`}>
          <Icon className="h-4 w-4" />
          <SectionLabel>{title}</SectionLabel>
        </div>
        <div className="flex items-center gap-1.5">
          {danger && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-600">
              Falta completar
            </span>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              aria-label={`Editar ${title}`}
              className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-loca-50 hover:text-loca-600"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      {danger ? (
        <div className="space-y-2">
          <p className="text-sm text-red-600">Necesitamos este dato para generar una estrategia correcta.</p>
          {(onFix || onEdit) && (
            <Button variant="danger" size="sm" onClick={onFix || onEdit}>
              <ArrowRight className="h-3.5 w-3.5" /> Completar este dato
            </Button>
          )}
        </div>
      ) : (
        <div className="text-sm leading-relaxed text-zinc-700">{children}</div>
      )}
    </Card>
  );
}

export { missingCritical };
