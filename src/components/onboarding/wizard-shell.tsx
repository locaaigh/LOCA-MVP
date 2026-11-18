"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import { Logo } from "@/components/brand";
import { StepIntro } from "@/components/onboarding/step-intro";
import { SUMMARY_STEP, WIZARD_TOTAL, stepLabel } from "@/lib/onboarding/steps";
import { Check, ArrowRight } from "lucide-react";

/**
 * Chrome del formulario manual: header con progreso, stepper navegable 1..7,
 * título del paso y footer Atrás/Siguiente. En el Resumen de los flujos con
 * Eva (`assistedSummary`) se oculta toda navegación hacia los pasos manuales.
 */
export function WizardShell({
  step,
  onSummary,
  assistedSummary,
  onGoToStep,
  onBack,
  onNext,
  children,
}: {
  step: number;
  onSummary: boolean;
  assistedSummary: boolean;
  onGoToStep: (step: number) => void;
  onBack: () => void;
  onNext: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border/70 bg-card/85 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Logo className="text-xl" />
            </Link>
            <span className="text-sm font-semibold text-faint">
              {assistedSummary ? (
                <span className="text-foreground-muted">Resumen</span>
              ) : (
                <>
                  Paso {step} de {WIZARD_TOTAL} · <span className="text-foreground-muted">{stepLabel(step)}</span>
                </>
              )}
            </span>
          </div>
          {!assistedSummary && (
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-loca-500 to-loca-400 transition-all duration-500"
                style={{ width: `${(step / WIZARD_TOTAL) * 100}%` }}
              />
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 pb-28 sm:px-6">
        {/* Stepper navegable (pasos 1..7) — oculto en el resumen de los flujos con Eva */}
        {!assistedSummary && (
          <div className="mb-7 flex items-center">
            {Array.from({ length: WIZARD_TOTAL }, (_, k) => k + 1).map((i, idx) => (
              <div key={i} className="flex flex-1 items-center">
                <button
                  onClick={() => i <= step && onGoToStep(i)}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                    i < step
                      ? "bg-lima-400 text-ink shadow-glow-lima"
                      : i === step
                        ? "bg-loca-600 text-white shadow-lift"
                        : "bg-border/80 text-faint"
                  }`}
                >
                  {i < step ? <Check className="h-4 w-4" /> : i}
                </button>
                {idx < WIZARD_TOTAL - 1 && (
                  <div className={`mx-1.5 h-1 flex-1 rounded-full transition ${i < step ? "bg-lima-400" : "bg-border/80"}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {!onSummary && (
          <>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{stepLabel(step)}</h1>
            <StepIntro step={step} />
          </>
        )}

        <div className="mt-5">{children}</div>
      </div>

      {!onSummary && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/70 bg-card/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
            <Button variant="ghost" size="lg" onClick={onBack}>
              {step === 1 ? "Volver al inicio" : "Atrás"}
            </Button>
            <Button size="lg" onClick={onNext}>
              {step === SUMMARY_STEP - 1 ? "Ver resumen" : "Siguiente"} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
