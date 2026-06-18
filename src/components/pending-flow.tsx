"use client";

import * as React from "react";
import { Button, Card, ChipSelect, Input, Select, Textarea } from "@/components/ui";
import { ChannelSelector } from "@/components/channel-selector";
import { SearchableCountrySelect } from "@/components/inputs";
import type { BusinessQuestion, QSection } from "@/lib/business-questions";
import type { Business } from "@/lib/types";
import type { SummarySectionKey } from "@/components/onboarding-summary";
import { Check, Package, Sparkles, ArrowRight, Wand2, PencilLine } from "lucide-react";

// QSection → clave de sección editable del resumen (para "Editar sección completa").
const SECTION_MAP: Record<QSection, SummarySectionKey> = {
  basicos: "basicos",
  productos: "productos",
  audiencia: "audiencia",
  propuesta: "propuesta",
  canales: "canales",
  objetivos: "objetivos",
  brandkit: "brandkit",
  agenda: "canales",
  fechas: "canales",
  restricciones: "keywords",
  necesidades: "comerciales",
};

// Asistente enfocado: una pregunta/campo por vez ("1 de N").
export function PendingFlow({
  business,
  questions,
  applyPatch,
  onSuggest,
  onEditSection,
  onDone,
  doneLabel = "Terminar",
}: {
  business: Business;
  questions: BusinessQuestion[];
  applyPatch: (patch: Partial<Business>) => void;
  onSuggest?: () => void;
  onEditSection?: (key: SummarySectionKey) => void;
  onDone: () => void;
  doneLabel?: string;
}) {
  const [index, setIndex] = React.useState(0);
  const [error, setError] = React.useState(false);
  const total = questions.length;
  const current = questions[Math.min(index, Math.max(0, total - 1))];
  const [value, setValue] = React.useState<any>(() => (current ? current.get(business) : ""));

  const isEmpty = (v: any) =>
    v == null || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0);

  // Re-inicializa el valor al cambiar de pregunta o cuando Eva sugiere (business cambia).
  React.useEffect(() => {
    if (current) setValue(current.get(business));
    setError(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, business]);

  if (total === 0 || !current) {
    return (
      <Card className="flex flex-col items-center gap-3 py-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-lima-100 text-lima-700">
          <Check className="h-7 w-7" />
        </span>
        <p className="text-lg font-bold text-zinc-900">No queda nada pendiente 🎉</p>
        <Button size="lg" onClick={onDone}>{doneLabel}</Button>
      </Card>
    );
  }

  const isProducts = current.input === "products";
  const blockEmpty = current.critical && !isProducts && isEmpty(value);

  function next() {
    if (index < total - 1) setIndex(index + 1);
    else onDone();
  }
  function saveAndNext() {
    // Crítico: no se puede guardar vacío.
    if (blockEmpty) {
      setError(true);
      return;
    }
    applyPatch(current.apply(business, value));
    setError(false);
    next();
  }

  return (
    <Card className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-loca-600">Completemos este dato</p>
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-500">
          {index + 1} de {total}
        </span>
      </div>

      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-bold tracking-tight text-zinc-900">{current.label}</h3>
          {current.critical ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">Necesario</span>
          ) : (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-bold text-zinc-500">Recomendado</span>
          )}
        </div>
        <p className="mt-1 text-sm text-zinc-500">{current.why}</p>
      </div>

      {/* Input según tipo */}
      <div className="min-h-[3rem]">
        {isProducts ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 p-5 text-center">
            <Package className="mx-auto h-7 w-7 text-loca-500" />
            <p className="mt-2 text-sm text-zinc-600">
              Los productos y servicios se cargan en su propio editor (con detección desde tu web, sin inventar precios).
            </p>
            {onEditSection && (
              <Button className="mt-3" onClick={() => onEditSection("productos")}>
                <Package className="h-4 w-4" /> Abrir editor de productos
              </Button>
            )}
          </div>
        ) : current.input === "country" ? (
          <SearchableCountrySelect value={value || ""} onChange={setValue} error={error} />
        ) : current.input === "text" ? (
          <Input value={value || ""} onChange={(e) => setValue(e.target.value)} placeholder={current.placeholder} autoFocus />
        ) : current.input === "textarea" ? (
          <Textarea value={value || ""} onChange={(e) => setValue(e.target.value)} placeholder={current.placeholder} className="min-h-[110px]" autoFocus />
        ) : current.input === "select" ? (
          <Select value={value || ""} onChange={(e) => setValue(e.target.value)}>
            <option value="">Elegí una opción</option>
            {(current.options || []).map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </Select>
        ) : current.input === "channels" ? (
          <ChannelSelector value={Array.isArray(value) ? value : []} onChange={setValue} />
        ) : (
          <ChipSelect
            options={current.options || []}
            value={Array.isArray(value) ? value : []}
            onChange={setValue}
            allowCustom={current.allowCustom}
          />
        )}
      </div>

      {/* Estado / error para campos críticos */}
      {error ? (
        <p className="text-sm font-semibold text-red-600">
          {current.canSuggest
            ? "Completá este dato para avanzar (es necesario para tu estrategia)."
            : "Eva no puede sugerir este dato sin inventarlo. Completalo para avanzar."}
        </p>
      ) : current.critical && !isProducts ? (
        <p className="text-xs text-zinc-400">Necesario para que Eva no genere una estrategia genérica.</p>
      ) : null}

      {/* Acciones */}
      <div className="space-y-2.5">
        {!isProducts && (
          <Button variant="success" size="lg" className="w-full" onClick={saveAndNext} disabled={blockEmpty}>
            <Check className="h-5 w-5" /> Guardar y seguir
          </Button>
        )}
        {isProducts && (
          <Button variant="success" size="lg" className="w-full" onClick={next}>
            <ArrowRight className="h-5 w-5" /> Listo, seguir
          </Button>
        )}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {current.canSuggest && onSuggest && (
            <Button variant="outline" size="sm" onClick={onSuggest}>
              <Wand2 className="h-3.5 w-3.5 text-loca-500" /> Que Eva sugiera
            </Button>
          )}
          {!current.critical && (
            <Button variant="ghost" size="sm" onClick={next}>
              Saltar por ahora
            </Button>
          )}
          {onEditSection && !isProducts && (
            <Button variant="ghost" size="sm" onClick={() => onEditSection(SECTION_MAP[current.section])}>
              <PencilLine className="h-3.5 w-3.5" /> Editar sección completa
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
