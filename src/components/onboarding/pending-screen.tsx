"use client";

import { Logo } from "@/components/brand";
import type { SummarySectionKey } from "@/components/onboarding-summary";
import { QuestionField } from "@/components/question-field";
import { Button, Card } from "@/components/ui";
import { SECTION_LABELS, missingRequiredQuestions, type BusinessQuestion, type QSection } from "@/lib/business-questions";
import { PENDING_STEP_OF_SECTION, SUMMARY_KEY_OF_SECTION } from "@/lib/onboarding/sections";
import { stepLabel } from "@/lib/onboarding/steps";
import type { Business } from "@/lib/types";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

// Número de paso (chip) para el flujo de IA externa.
export function StepDot({ n }: { n: number }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-loca-500 to-loca-700 text-sm font-bold text-white shadow-sm">
      {n}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// PANTALLA DE PENDIENTES: asistente enfocado 1-de-N (web/.md)
// ─────────────────────────────────────────────────────────────

export function PendingScreen({
  business,
  applyPatch,
  onEditSection,
  onSuggest,
  onSummary,
  onBack,
}: {
  business: Business;
  applyPatch: (p: Partial<Business>) => void;
  onEditSection: (key: SummarySectionKey) => void;
  onSuggest: () => void;
  onSummary: () => void;
  onBack: () => void;
}) {
  // Lista CONGELADA de obligatorios faltantes al entrar: no se reordena ni
  // desaparece mientras los completás (al terminar, van al resumen). Se agrupa
  // por paso del wizard y se recorre paso a paso: solo los pasos con faltantes
  // y, dentro de cada paso, solo los campos que Eva NO completó.
  const [steps] = useState<[number, BusinessQuestion[]][]>(() => {
    const byStep = new Map<number, BusinessQuestion[]>();
    for (const q of missingRequiredQuestions(business)) {
      const s = PENDING_STEP_OF_SECTION[q.section] ?? 6;
      byStep.set(s, [...(byStep.get(s) ?? []), q]);
    }
    return [...byStep.entries()].sort((a, b) => a[0] - b[0]);
  });
  const [idx, setIdx] = useState(0);
  const [errors, setErrors] = useState<Set<string>>(new Set());

  const current = steps[Math.min(idx, Math.max(0, steps.length - 1))];
  const questions = useMemo(() => current?.[1] ?? [], [current]);
  const allQuestions = useMemo(() => steps.flatMap(([, qs]) => qs), [steps]);

  // Dentro del paso actual, las preguntas se agrupan por su sección.
  const groups = useMemo(() => {
    const map = new Map<QSection, BusinessQuestion[]>();
    for (const q of questions) {
      const arr = map.get(q.section) ?? [];
      arr.push(q);
      map.set(q.section, arr);
    }
    return [...map.entries()];
  }, [questions]);

  // Contador en vivo de lo que todavía falta en total (los críticos bloquean;
  // el resto se puede completar después). Escribimos directo al negocio.
  const remaining = allQuestions.filter((q) => q.isMissing(business)).length;
  const canSuggestAny = allQuestions.some((q) => q.canSuggest);
  const isLast = idx >= steps.length - 1;

  function handleContinue() {
    // Acá TODO lo que se muestra es obligatorio (lo define el admin): bloquea
    // cualquier faltante del paso actual. Productos se edita en su modal y lo
    // bloquea el resumen (Confirmar deshabilitado) si quedó vacío.
    const missNow = questions.filter((q) => q.input !== "products" && q.isMissing(business));
    if (missNow.length > 0) {
      setErrors(new Set(missNow.map((q) => q.id)));
      requestAnimationFrame(() =>
        document.getElementById(`pf-${missNow[0].id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
      );
      return;
    }
    setErrors(new Set());
    if (isLast) {
      onSummary();
      return;
    }
    setIdx(idx + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleBack() {
    if (idx > 0) {
      setErrors(new Set());
      setIdx(idx - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      onBack();
    }
  }

  function clearError(id: string) {
    if (!errors.has(id)) return;
    const n = new Set(errors);
    n.delete(id);
    setErrors(n);
  }

  return (
    <div className="relative min-h-screen overflow-hidden loca-hero-bg">
      <div className="loca-orb left-[-12%] top-[-8%] h-80 w-80 animate-orb-drift bg-loca-200/45" />
      <div className="loca-orb bottom-[-14%] right-[-10%] h-80 w-80 animate-orb-drift bg-lima-200/35" style={{ animationDelay: "-5s" }} />

      <div className="flex items-center justify-between px-6 pt-7 sm:px-10">
        <Link href="/">
          <Logo className="text-2xl" />
        </Link>
        <button onClick={handleBack} className="flex items-center gap-1 text-sm font-semibold text-faint transition hover:text-foreground-muted">
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>
      </div>

      <div className="mx-auto max-w-2xl animate-fade-in-up px-4 py-9 pb-28 sm:px-6">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-loca-500 to-loca-700 text-white shadow-lift ring-8 ring-loca-50">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-[1.7rem] font-extrabold tracking-tight text-foreground sm:text-[2.1rem] sm:leading-[1.1]">
            Eva ya completó gran parte.<br className="hidden sm:block" /> Completá <span className="loca-gradient-text">lo que falta</span>.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] text-muted-foreground">
            Solo te mostramos los datos que Eva no pudo completar{remaining > 0 ? `: ${remaining} ${remaining === 1 ? "dato" : "datos"}` : ""}.
          </p>
          {canSuggestAny && (
            <Button variant="outline" size="sm" className="mt-4" onClick={onSuggest}>
              <Sparkles className="h-3.5 w-3.5 text-loca-500" /> Que Eva sugiera lo que pueda
            </Button>
          )}
        </div>

        {/* Stepper: paso actual sobre el total de pasos CON faltantes */}
        {steps.length > 0 && current && (
          <div className="mb-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">
                Paso {idx + 1} de {steps.length}: <span className="text-accent">{stepLabel(current[0])}</span>
              </p>
              <span className="rounded-full bg-accent-subtle-bg px-2.5 py-1 text-xs font-bold text-accent-subtle-fg">
                {questions.length} {questions.length === 1 ? "dato" : "datos"}
              </span>
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-loca-500 to-loca-400 transition-all duration-500"
                style={{ width: `${((idx + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {questions.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-lima-100 dark:bg-lima-900/50 text-lima-700 dark:text-lima-300">
              <Check className="h-7 w-7" />
            </span>
            <p className="text-lg font-bold text-foreground">No falta nada 🎉</p>
          </Card>
        ) : (
          <div className="space-y-5">
            {groups.map(([section, qs]) => (
              <Card key={section} className="space-y-5">
                <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent">
                  {SECTION_LABELS[section]}
                </h2>
                {qs.map((q) => {
                  const done = !q.isMissing(business);
                  return (
                    <div key={q.id} id={`pf-${q.id}`} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-semibold text-foreground-soft">{q.label}</label>
                        {done ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-lima-50 dark:bg-lima-950/40 px-2 py-0.5 text-[11px] font-bold text-lima-700 dark:text-lima-300">
                            <Check className="h-3 w-3" /> Listo
                          </span>
                        ) : (
                          // Todo lo que llega acá es obligatorio (lo define el admin).
                          <span className="rounded-full bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">Obligatorio</span>
                        )}
                      </div>
                      {q.why && <p className="text-xs text-faint">{q.why}</p>}
                      <QuestionField
                        question={q}
                        business={business}
                        value={q.get(business)}
                        error={errors.has(q.id)}
                        onChange={(v) => {
                          applyPatch(q.apply(business, v));
                          clearError(q.id);
                        }}
                        onEditProducts={() => onEditSection("productos")}
                        onEditSection={(section) => onEditSection(SUMMARY_KEY_OF_SECTION[section])}
                      />
                      {errors.has(q.id) && (
                        <p className="text-xs font-semibold text-red-600 dark:text-red-300">Completá este dato para continuar.</p>
                      )}
                    </div>
                  );
                })}
              </Card>
            ))}
          </div>
        )}

        <div className="mt-7">
          <div className="flex items-center gap-3">
            {idx > 0 && (
              <Button variant="ghost" size="lg" onClick={handleBack}>
                <ArrowLeft className="h-5 w-5" /> Atrás
              </Button>
            )}
            <Button variant="success" size="lg" className="flex-1" onClick={handleContinue}>
              {isLast ? "Guardar y continuar" : "Continuar"} <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
