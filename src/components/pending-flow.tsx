"use client";

import * as React from "react";
import { Button, Card } from "@/components/ui";
import { QuestionField } from "@/components/question-field";
import type { BusinessQuestion } from "@/lib/business-questions";
import type { Business } from "@/lib/types";
import { SUMMARY_KEY_OF_SECTION, type SummarySectionKey } from "@/lib/onboarding/sections";
import { Check, Sparkles, ArrowRight, Wand2, PencilLine } from "lucide-react";

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
        <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-lima-100 dark:bg-lima-900/50 text-lima-700 dark:text-lima-300">
          <Check className="h-7 w-7" />
        </span>
        <p className="text-lg font-bold text-foreground">No queda nada pendiente 🎉</p>
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
    <Card className="animate-scale-in space-y-5 shadow-glow">
      <div>
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent">
            <Sparkles className="h-3.5 w-3.5" /> Completemos este dato
          </p>
          <span className="rounded-full bg-accent-subtle-bg px-2.5 py-1 text-xs font-bold text-accent-subtle-fg">
            {index + 1} de {total}
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-loca-500 to-loca-400 transition-all duration-500"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-[1.35rem] font-bold tracking-tight text-foreground">{current.label}</h3>
          {current.critical ? (
            <span className="rounded-full bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">Necesario</span>
          ) : (
            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">Recomendado</span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{current.why}</p>
      </div>

      {/* Input según tipo: mismo render que "Completá lo que falta" */}
      <div className="min-h-[3rem]">
        <QuestionField
          question={current}
          business={business}
          value={value}
          onChange={setValue}
          error={error}
          autoFocus
          onEditProducts={onEditSection ? () => onEditSection("productos") : undefined}
          onEditSection={onEditSection ? (section) => onEditSection(SUMMARY_KEY_OF_SECTION[section]) : undefined}
        />
      </div>

      {/* Estado / error para campos críticos */}
      {error ? (
        <p className="text-sm font-semibold text-red-600 dark:text-red-300">
          {current.canSuggest
            ? "Completá este dato para avanzar (es necesario para tu estrategia)."
            : "Eva no puede sugerir este dato sin inventarlo. Completalo para avanzar."}
        </p>
      ) : current.critical && !isProducts ? (
        <p className="text-xs text-faint">Necesario para que Eva no genere una estrategia genérica.</p>
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
            <Button variant="ghost" size="sm" onClick={() => onEditSection(SUMMARY_KEY_OF_SECTION[current.section])}>
              <PencilLine className="h-3.5 w-3.5" /> Editar sección completa
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
