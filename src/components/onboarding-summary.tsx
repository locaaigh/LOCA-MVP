"use client";

import * as React from "react";
import { Badge, Button, Card, SectionLabel } from "@/components/ui";
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
  onEditSection,
}: {
  business: Business;
  onConfirm: () => void;
  onEdit: () => void;
  onEditSection: (key: SummarySectionKey) => void;
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

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-loca-50 text-loca-600">
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 className="mt-3 text-2xl font-bold tracking-tight">Eva entendió esto de tu marca</h2>
        <p className="mt-1 text-sm text-zinc-500">Revisalo y editá cualquier sección con el lápiz ✏️</p>
        {confidence != null && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-loca-50 px-3 py-1 text-sm font-medium text-loca-700">
            Eva pudo entender tu negocio en un {confidence}%
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryCard icon={ShoppingBag} title="Qué vende" onEdit={() => onEditSection("basicos")}>
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

        <SummaryCard icon={Heart} title="Por qué la elegirían" onEdit={() => onEditSection("propuesta")}>
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
            <div className="flex flex-wrap gap-1.5">
              {channels.map((c) => (
                <Badge key={c}>{c}</Badge>
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

        <SummaryCard icon={Target} title="Objetivos" onEdit={() => onEditSection("objetivos")}>
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
  children,
}: {
  icon: any;
  title: string;
  onEdit?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-zinc-500">
          <Icon className="h-4 w-4" />
          <SectionLabel>{title}</SectionLabel>
        </div>
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
      <div className="text-sm leading-relaxed text-zinc-700">{children}</div>
    </Card>
  );
}

export { missingCritical };
