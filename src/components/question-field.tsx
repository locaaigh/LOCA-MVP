"use client";

import { Button, ChipSelect, Input, Select, Textarea } from "@/components/ui";
import { ChannelSelector } from "@/components/channel-selector";
import { SearchableCountrySelect, SearchableRegionSelect } from "@/components/inputs";
import { SECTION_LABELS, type BusinessQuestion, type QSection } from "@/lib/business-questions";
import type { Business } from "@/lib/types";
import { ArrowRight, Package } from "lucide-react";

/**
 * Renderiza el input de UNA pregunta del onboarding según su tipo (text, textarea,
 * select, chips, channels, country, products). Fuente única del render de campos,
 * reutilizada por el flujo 1-a-1 (PendingFlow) y por la página "Completá lo que falta".
 */
export function QuestionField({
  question,
  business,
  value,
  onChange,
  error,
  onEditProducts,
  onEditSection,
  autoFocus,
}: {
  question: BusinessQuestion;
  business: Business;
  value: any;
  onChange: (v: any) => void;
  error?: boolean;
  /** Para el caso "products": abrir el editor de productos. */
  onEditProducts?: () => void;
  /** Para el caso "section": ir a completar el campo a su sección del formulario. */
  onEditSection?: (section: QSection) => void;
  autoFocus?: boolean;
}) {
  const options =
    typeof question.options === "function" ? question.options(business) : question.options || [];

  switch (question.input) {
    case "products":
      return (
        <div className="rounded-2xl border border-dashed border-border bg-surface-subtle/60 p-5 text-center">
          <Package className="mx-auto h-7 w-7 text-loca-500" />
          <p className="mt-2 text-sm text-muted-foreground-2">
            Los productos y servicios se cargan en su propio editor (con detección desde tu web, sin inventar precios).
          </p>
          {onEditProducts && (
            <Button className="mt-3" onClick={onEditProducts}>
              <Package className="h-4 w-4" /> Abrir editor de productos
            </Button>
          )}
        </div>
      );
    case "country":
      return <SearchableCountrySelect value={value || ""} onChange={onChange} error={error} />;
    case "region":
      return (
        <SearchableRegionSelect
          country={business.country || ""}
          value={value || ""}
          onChange={onChange}
          error={error}
        />
      );
    case "section":
      return (
        <div className="rounded-2xl border border-dashed border-border bg-surface-subtle/60 p-4 text-center">
          <p className="text-sm text-muted-foreground-2">
            Este dato se completa en la sección <strong>{SECTION_LABELS[question.section]}</strong> del formulario.
          </p>
          {onEditSection && (
            <Button variant="outline" className="mt-3" onClick={() => onEditSection(question.section)}>
              Completar en {SECTION_LABELS[question.section]} <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      );
    case "text":
      return (
        <Input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          autoFocus={autoFocus}
        />
      );
    case "textarea":
      return (
        <Textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          className="min-h-[110px]"
          autoFocus={autoFocus}
        />
      );
    case "select":
      return (
        <Select value={value || ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">Elegí una opción</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      );
    case "channels":
      return <ChannelSelector value={Array.isArray(value) ? value : []} onChange={onChange} />;
    default:
      return (
        <ChipSelect
          options={options}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
          allowCustom={question.allowCustom}
        />
      );
  }
}
