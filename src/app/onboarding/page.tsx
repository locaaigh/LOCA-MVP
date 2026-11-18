"use client";

import { Suspense } from "react";
import { hasSupabaseClientConfig } from "@/lib/supabase/client";
import { Button, Modal } from "@/components/ui";
import { OnboardingSignupModal } from "@/components/onboarding-signup-modal";
import { OnboardingSummary } from "@/components/onboarding-summary";
import { PendingFlow } from "@/components/pending-flow";
import { EvaChatBubble } from "@/components/eva-chat";
import { pendingQuestions } from "@/lib/business-questions";
import { useOnboardingFlow } from "@/lib/onboarding/use-onboarding-flow";
import { MethodSelect } from "@/components/onboarding/method-select";
import { WebImportScreen } from "@/components/onboarding/web-import-screen";
import { AiImportScreen } from "@/components/onboarding/ai-import-screen";
import { PendingScreen } from "@/components/onboarding/pending-screen";
import { WizardShell } from "@/components/onboarding/wizard-shell";
import { SectionEditor, sectionTitle } from "@/components/onboarding/section-editor";
import { StepBasic } from "@/components/onboarding/step-basic";
import { StepBrand } from "@/components/onboarding/step-brand";
import { StepBrandKit } from "@/components/onboarding/step-brand-kit";
import { StepProducts } from "@/components/onboarding/step-products";
import { StepAudience } from "@/components/onboarding/step-audience";
import { StepGoals } from "@/components/onboarding/step-goals";
import { StepPublish } from "@/components/onboarding/step-publish";

export default function OnboardingPage() {
  // useSearchParams (modo edición) requiere un boundary de Suspense en Next 14.
  return (
    <Suspense fallback={null}>
      <OnboardingPageInner />
    </Suspense>
  );
}

function OnboardingPageInner() {
  const f = useOnboardingFlow();
  const { b, set, step, setStep, phase, setPhase } = f;

  return (
    <main className="min-h-screen">
      {f.toastNode}

      {/* ── Pantalla inicial: elección de método (sin stepper, sin footer, sin scroll) ── */}
      {phase === "select" && <MethodSelect onPick={f.pickMethod} />}

      {/* ── Pantalla Web (única, centrada) ── */}
      {phase === "web" && (
        <WebImportScreen
          initialUrl={b.websiteUrl || ""}
          loading={f.webLoading}
          onAnalyze={f.analyzeWeb}
          onBack={() => setPhase("select")}
        />
      )}

      {/* ── Pantalla IA externa (única, centrada) ── */}
      {phase === "ai" && (
        <AiImportScreen businessName={b.name} onLoad={f.loadExternalMd} onBack={() => setPhase("select")} />
      )}

      {/* ── Pantalla de pendientes (después de web/.md incompletos) ── */}
      {phase === "pending" && (
        <PendingScreen
          business={b}
          applyPatch={set}
          onEditSection={f.openSection}
          onSuggest={f.completeWithEva}
          onSummary={f.goSummary}
          onBack={() => setPhase("select")}
        />
      )}

      {/* ── Wizard manual (solo aquí aparecen pasos / stepper / footer) ── */}
      {phase === "wizard" && (
        <WizardShell
          step={step}
          onSummary={f.onSummary}
          assistedSummary={f.assistedSummary}
          onGoToStep={setStep}
          onBack={() => (step === 1 ? setPhase("select") : setStep(step - 1))}
          onNext={f.tryNext}
        >
          {step === 1 && <StepBasic b={b} set={set} subcats={f.subcats} missing={f.missing} statusOf={f.statusOf} />}
          {step === 2 && <StepBrand b={b} set={set} missing={f.missing} statusOf={f.statusOf} />}
          {step === 3 && <StepBrandKit b={b} set={set} />}
          {step === 4 && <StepProducts b={b} set={set} show={f.show} />}
          {step === 5 && <StepAudience b={b} set={set} missing={f.missing} />}
          {step === 6 && <StepGoals b={b} set={set} missing={f.missing} />}
          {step === 7 && <StepPublish b={b} set={set} missing={f.missing} />}
          {step === 8 && (
            <OnboardingSummary
              business={b}
              onConfirm={f.finish}
              onEdit={f.assistedSummary ? undefined : () => setStep(1)}
              onEditSection={f.openSection}
              onCompleteWithEva={f.completeWithEva}
              onFixCritical={() => f.setCriticalOpen(true)}
              confirmLabel={f.editMode ? "Guardar cambios" : "Confirmar y preparar estrategia"}
            />
          )}
        </WizardShell>
      )}

      {/* Faltantes críticos: flujo enfocado 1-de-N (campo por campo) */}
      <Modal open={f.criticalOpen} onClose={() => f.setCriticalOpen(false)} title="Falta este dato para tu estrategia">
        <PendingFlow
          business={b}
          questions={pendingQuestions(b).filter((q) => q.critical)}
          applyPatch={set}
          onSuggest={f.completeWithEva}
          onEditSection={(k) => {
            f.setCriticalOpen(false);
            f.openSection(k);
          }}
          onDone={() => f.setCriticalOpen(false)}
          doneLabel="Listo"
        />
      </Modal>

      {/* Edición enfocada de una sección (resumen y pendientes).
          Botones en el footer sticky: siempre visibles aunque la ficha scrollee
          (feedback formulario, ítem 18). */}
      <Modal
        open={!!f.editSection}
        onClose={f.cancelSection}
        title={sectionTitle(f.editSection)}
        footer={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="success" size="lg" className="flex-1" onClick={f.saveSection}>
              Guardar cambios
            </Button>
            <Button variant="ghost" size="lg" className="flex-1" onClick={f.cancelSection}>
              Cancelar
            </Button>
          </div>
        }
      >
        <SectionEditor section={f.editSection} b={b} set={set} subcats={f.subcats} show={f.show} />
      </Modal>

      {hasSupabaseClientConfig() && f.pendingBusiness && (
        <OnboardingSignupModal
          open={f.signupOpen}
          business={f.pendingBusiness}
          onClose={() => f.setSignupOpen(false)}
          router={f.router}
        />
      )}

      <EvaChatBubble raised={phase === "wizard"} />
    </main>
  );
}
