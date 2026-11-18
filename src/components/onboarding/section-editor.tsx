"use client";

import type { SummarySectionKey } from "@/components/onboarding-summary";
import { StepAudience } from "@/components/onboarding/step-audience";
import { StepBasic } from "@/components/onboarding/step-basic";
import { StepBrand } from "@/components/onboarding/step-brand";
import { StepBrandKit } from "@/components/onboarding/step-brand-kit";
import { StepGoals } from "@/components/onboarding/step-goals";
import { StepProducts } from "@/components/onboarding/step-products";
import { Field, Input } from "@/components/ui";
import type { Business } from "@/lib/types";

// ── Edición de una sección desde el resumen ──────────────────
const SECTION_TITLES: Record<SummarySectionKey, string> = {
  basicos: "Datos básicos del negocio",
  productos: "Productos y servicios",
  audiencia: "Audiencia",
  propuesta: "Propuesta de valor",
  canales: "Canales y marketing actual",
  objetivos: "Objetivos",
  brandkit: "Identidad visual",
  comerciales: "Datos comerciales",
  keywords: "Palabras clave y a evitar",
};

export function sectionTitle(s: SummarySectionKey | null): string {
  return s ? SECTION_TITLES[s] : "";
}

export function SectionEditor({
  section,
  b,
  set,
  subcats,
  show,
}: {
  section: SummarySectionKey | null;
  b: Business;
  set: (p: Partial<Business>) => void;
  subcats: string[];
  show: (m: string) => void;
}) {
  if (!section) return null;
  const noMissing = new Set<string>();
  const noStatus = () => undefined;
  switch (section) {
    case "basicos":
      return <StepBasic b={b} set={set} subcats={subcats} missing={noMissing} statusOf={noStatus} />;
    case "productos":
      return <StepProducts b={b} set={set} show={show} />;
    case "audiencia":
      return <StepAudience b={b} set={set} missing={noMissing} />;
    case "propuesta":
    case "canales":
      return <StepBrand b={b} set={set} missing={noMissing} statusOf={noStatus} />;
    case "objetivos":
      return <StepGoals b={b} set={set} missing={noMissing} />;
    case "brandkit":
    case "keywords":
      return <StepBrandKit b={b} set={set} />;
    case "comerciales":
      return <CommercialEditor b={b} set={set} />;
    default:
      return null;
  }
}

// Editor simple de datos comerciales (Business Intelligence · contactInfo)
function CommercialEditor({ b, set }: { b: Business; set: (p: Partial<Business>) => void }) {
  const bi = b.businessIntelligence || { socialLinks: [], contactInfo: {}, conversionPaths: {}, valuePropositions: [] };
  const ci = bi.contactInfo || {};
  const setCi = (patch: Partial<typeof ci>) =>
    set({ businessIntelligence: { ...bi, contactInfo: { ...ci, ...patch } } });
  return (
    <div className="space-y-3">
      <Field label="WhatsApp">
        <Input value={ci.whatsapp || ""} onChange={(e) => setCi({ whatsapp: e.target.value })} placeholder="https://wa.me/549..." />
      </Field>
      <Field label="Email">
        <Input value={ci.email || ""} onChange={(e) => setCi({ email: e.target.value })} placeholder="hola@tunegocio.com" />
      </Field>
      <Field label="Teléfono">
        <Input value={ci.phone || ""} onChange={(e) => setCi({ phone: e.target.value })} placeholder="+54 11 ..." />
      </Field>
      <Field label="Dirección">
        <Input value={ci.address || ""} onChange={(e) => setCi({ address: e.target.value })} placeholder="Calle 123, Ciudad" />
      </Field>
      <Field label="Horarios">
        <Input value={ci.openingHours || ""} onChange={(e) => setCi({ openingHours: e.target.value })} placeholder="Lun a Vie 9 a 18h" />
      </Field>
    </div>
  );
}
