"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useStore, emptyBusiness } from "@/lib/store";
import { canGenerateStrategy, requiresAuthForStrategy } from "@/lib/auth/user";
import { hasSupabaseClientConfig } from "@/lib/supabase/client";
import { completeOnboardingAndGoToStrategy, prepareFinalBusiness, resumeOnboardingDraftIfAny } from "@/lib/onboarding/complete";
import { saveOnboardingDraft } from "@/lib/onboarding-draft";
import { OnboardingSignupModal } from "@/components/onboarding-signup-modal";
import {
  INDUSTRIES,
  SUBCATEGORIES,
  BUSINESS_TYPES,
  BUSINESS_STAGES,
  VALUE_SUGGESTIONS,
  ADVANTAGE_SUGGESTIONS,
  AGE_RANGES,
  MARKETING_ACTIVITIES,
  seasonalityOptionsFor,
  specialDatesOptionsFor,
  GENDER_OPTIONS,
  foundingYearOptions,
} from "@/lib/constants";
import type { Business, ProductService, ProductServiceType, WebsiteAnalysis } from "@/lib/types";
import { Button, Card, ChipSelect, EvaLoading, EVA_THINKING_MD, EVA_THINKING_WEB, Field, Input, Modal, Select, Textarea, useToast } from "@/components/ui";
import {
  HelpField,
  SearchableCountrySelect,
  SearchableRegionSelect,
  OptionCards,
  YesNoChoice,
  EvaSuggestionButton,
} from "@/components/inputs";
import { ChannelSelector } from "@/components/channel-selector";
import {
  ProductServiceCard,
  ProductServiceForm,
  ProductServiceImporter,
} from "@/components/product-service";
import { BrandKitEditor } from "@/components/brand-kit";
import { VisualStylePicker } from "@/components/visual-style-picker";
import { PhotoUploader } from "@/components/photo-uploader";
import { OnboardingSummary, missingCritical, type SummarySectionKey } from "@/components/onboarding-summary";
import { PendingFlow } from "@/components/pending-flow";
import { pendingQuestions } from "@/lib/business-questions";
import { Logo } from "@/components/brand";
import { EvaChatBubble } from "@/components/eva-chat";
import { getFieldExample } from "@/lib/examples";
import { getMissingRequiredFields } from "@/lib/onboarding-validation";
import { emptyBrandKit } from "@/lib/store";
import { api } from "@/lib/api";
import { uid, copyToClipboard, nowIso, downloadFile } from "@/lib/utils";
import { externalAiPrompt, emptyMdTemplate, parseExternalMarkdown, isAnalysisComplete } from "@/lib/md-import";
import { suggestPending } from "@/lib/eva-suggest";
import { track } from "@/lib/analytics";
import {
  Check,
  Globe,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Plus,
  Bot,
  Copy,
  Upload,
  FileText,
  Download,
  Pencil,
} from "lucide-react";
import type { FieldStatusKind } from "@/lib/types";

const STEPS = [
  "Empecemos fácil",
  "Negocio",
  "Marca",
  "Identidad visual",
  "Productos / Servicios",
  "Audiencia",
  "Objetivos",
  "Resumen",
];
const CURRENT_YEAR = 2026;
const SUMMARY_STEP = STEPS.length - 1; // 7
const WIZARD_TOTAL = STEPS.length - 1; // 7 pasos reales del formulario (1..7)

// Fases del onboarding (la pantalla inicial es independiente del wizard).
type Phase = "select" | "web" | "ai" | "pending" | "wizard";

export default function OnboardingPage() {
  // useSearchParams (modo edición) requiere un boundary de Suspense en Next 14.
  return (
    <Suspense fallback={null}>
      <OnboardingPageInner />
    </Suspense>
  );
}

function OnboardingPageInner() {
  const router = useRouter();
  const user = useStore((s) => s.user);
  const hydrated = useStore((s) => s.hydrated);
  const login = useStore((s) => s.login);
  const { show, node } = useToast();

  const [signupOpen, setSignupOpen] = useState(false);
  const [pendingBusiness, setPendingBusiness] = useState<Business | null>(null);

  // Fase de la experiencia. La pantalla inicial NO es el paso 1 del wizard:
  // "select" (elección de método) → "web" / "ai" (pantallas únicas) →
  // "pending" (faltantes agrupados) → "wizard" (formulario manual de pasos).
  const [phase, setPhase] = useState<Phase>("select");
  const [step, setStep] = useState(1); // el wizard manual arranca en el paso 1 (Negocio)
  const [b, setB] = useState<Business>(() => emptyBusiness(user?.id || "anon"));
  const [missing, setMissing] = useState<Set<string>>(new Set());

  // Modo edición del formulario completo (item 25): carga el negocio activo en
  // el wizard y, al confirmar, guarda sin regenerar la estrategia.
  const editMode = useSearchParams().get("edit") === "1";
  const activeBusiness = useStore((s) => s.businesses.find((x) => x.id === s.activeBusinessId) || null);
  const editLoaded = useRef(false);
  useEffect(() => {
    if (editLoaded.current || !editMode || !activeBusiness) return;
    editLoaded.current = true;
    setB(activeBusiness);
    setStep(1);
    setPhase("wizard");
  }, [editMode, activeBusiness]);
  const [webLoading, setWebLoading] = useState(false);
  const [criticalOpen, setCriticalOpen] = useState(false);

  // ── Analytics del funnel de onboarding (ver docs/ANALYTICS-PLAN.md) ──
  const onboardingStartedAt = useRef(Date.now());
  const stepStartedAt = useRef(Date.now());
  const startTracked = useRef(false);
  const completeTracked = useRef(false);
  useEffect(() => {
    if (startTracked.current || editMode) return;
    startTracked.current = true;
    track("onboarding_started", {}, { businessId: b.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode]);
  useEffect(() => {
    if (phase !== "wizard" || editMode) return;
    stepStartedAt.current = Date.now();
    track("onboarding_step_viewed", { step, label: STEPS[step] });
  }, [phase, step, editMode]);
  // Edición de una sección desde el resumen final
  const [editSection, setEditSection] = useState<SummarySectionKey | null>(null);
  const [draftBackup, setDraftBackup] = useState<Business | null>(null);

  function openSection(key: SummarySectionKey) {
    setDraftBackup(b);
    setEditSection(key);
    track("onboarding_section_edited", { section: key });
  }
  function saveSection() {
    setDraftBackup(null);
    setEditSection(null);
  }
  function cancelSection() {
    if (draftBackup) setB(draftBackup);
    setDraftBackup(null);
    setEditSection(null);
  }

  function completeWithEva() {
    track("onboarding_eva_suggested", { scope: "pending" });
    const { patch, statuses, stillMissing } = suggestPending(b);
    setB((prev) => ({ ...prev, ...patch, fieldStatuses: { ...prev.fieldStatuses, ...statuses } }));
    if (stillMissing.length) {
      show(`Eva sugirió lo que pudo. Todavía necesitás (datos reales): ${stillMissing.join(", ")}.`);
    } else {
      show("Eva completó los pendientes con sugerencias. Revisalas y editá lo que quieras 💗");
    }
  }

  // Al cambiar de paso, siempre empezar arriba (especialmente en mobile).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [step]);

  // Retomar borrador tras confirmación de email (?resume=1).
  useEffect(() => {
    if (!hydrated || !canGenerateStrategy(user)) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("resume") !== "1") return;
    void resumeOnboardingDraftIfAny(router);
  }, [hydrated, user, router]);

  // set normal: si el usuario edita un campo que Eva había marcado, pasa a "Editado por vos".
  const set = (patch: Partial<Business>) =>
    setB((prev) => {
      const next = { ...prev, ...patch };
      if (prev.fieldStatuses) {
        const fs = { ...prev.fieldStatuses };
        let changed = false;
        for (const k of Object.keys(patch)) {
          if (fs[k] && fs[k].status !== "user") {
            fs[k] = { status: "user" };
            changed = true;
          }
        }
        if (changed) next.fieldStatuses = fs;
      }
      return next;
    });

  const statusOf = (f: string): FieldStatusKind | undefined => b.fieldStatuses?.[f]?.status;

  // Aplica el análisis de la web (sin marcar como editado).
  // Devuelve el negocio resultante para poder decidir el ruteo (resumen vs pendientes).
  function applyAnalysis(a: WebsiteAnalysis): Business {
    const ff = a.foundFields;
    let computed: Business | null = null;
    setB((prev) => {
      const next: Business = { ...prev };
      if (ff.name) next.name = ff.name;
      if (ff.websiteUrl) next.websiteUrl = ff.websiteUrl;
      if (ff.industry) next.industry = ff.industry;
      if (ff.subcategory) next.subcategory = ff.subcategory;
      if (ff.businessType) next.businessType = ff.businessType;
      if (ff.businessModel && ["B2B", "B2C", "Ambos"].includes(ff.businessModel))
        next.businessModel = ff.businessModel as any;
      if (ff.country) next.country = ff.country;
      if (ff.state) next.state = ff.state;
      if (ff.city) next.city = ff.city;
      if (ff.shortDescription) next.shortDescription = ff.shortDescription;
      if (ff.fullDescription) next.fullDescription = ff.fullDescription;
      if (ff.values?.length) next.values = ff.values;
      if (ff.competitiveAdvantages?.length) next.competitiveAdvantages = ff.competitiveAdvantages;
      if (ff.marketingChannels?.length) next.marketingChannels = ff.marketingChannels;
      if (ff.marketingActivities?.length) next.marketingActivities = ff.marketingActivities;
      if (ff.productsServices?.length) {
        next.productsServices = ff.productsServices.map((p) => ({
          ...emptyPS(p.type),
          name: p.name,
          category: p.category || "",
          shortDescription: p.shortDescription || "",
          // No inventamos precio: solo si vino explícito.
          priceMin: typeof p.price === "number" ? p.price : undefined,
          currency: p.currency || "ARS",
          isTopSeller: !!p.isTopSeller,
          saved: true,
          importSource: (p.source as any) || "website",
          confidence: p.confidence,
          shouldReview: p.shouldReview,
        }));
      }
      if (ff.audience) {
        next.audience = {
          ...prev.audience,
          ageRanges: ff.audience.ageRanges?.length ? ff.audience.ageRanges : prev.audience.ageRanges,
          gender: (ff.audience.gender as any) || prev.audience.gender,
          socioeconomicLevel: (ff.audience.socioeconomicLevel as any) || prev.audience.socioeconomicLevel,
          segments: ff.audience.segments?.length ? ff.audience.segments : prev.audience.segments,
          painPoints: ff.audience.painPoints?.length ? ff.audience.painPoints : prev.audience.painPoints,
          behavior: ff.audience.behavior || prev.audience.behavior,
        };
      }
      if (ff.goals) {
        next.goals = {
          ...prev.goals,
          primaryContentGoal: (ff.goals.primaryContentGoal as any) || prev.goals.primaryContentGoal,
          marketingObjectives: ff.goals.marketingObjectives || prev.goals.marketingObjectives,
          businessObjectives: ff.goals.businessObjectives || prev.goals.businessObjectives,
        };
      }
      if (ff.seasonalityTags?.length) {
        next.seasonalityTags = ff.seasonalityTags;
        next.hasSeasonality = true;
      }
      if (ff.specialDates?.length) {
        next.specialDates = ff.specialDates;
        next.hasSpecialDates = true;
      }
      if (ff.brandKit) next.brandKit = ff.brandKit;
      if (ff.businessIntelligence) next.businessIntelligence = ff.businessIntelligence;
      next.fieldStatuses = { ...prev.fieldStatuses, ...a.fieldStatuses };
      next.websiteExtractionStatus = "done";
      next.websiteExtractionConsent = true;
      computed = next;
      return next;
    });
    return computed ?? b;
  }

  // Decide a dónde ir después de analizar web / importar .md.
  // Suficiente info → resumen final. Faltan datos clave → pantalla de pendientes.
  function routeAfterImport(next: Business) {
    if (missingCritical(next).length === 0) {
      setStep(SUMMARY_STEP);
      setPhase("wizard");
    } else {
      setPhase("pending");
    }
  }

  // Elección de método en la pantalla inicial.
  function pickMethod(m: StartMode) {
    track("onboarding_method_selected", { method: m });
    set({ businessInfoImportSource: m === "ai" ? "external_ai_md" : m === "web" ? "website" : "manual" });
    if (m === "manual") {
      setStep(1);
      setPhase("wizard");
    } else {
      setPhase(m);
    }
  }

  // Analizar la web (pantalla Web).
  async function analyzeWeb(url: string) {
    const clean = url.trim();
    if (!clean) {
      show("Pegá la URL de tu web primero.");
      return;
    }
    setWebLoading(true);
    set({ websiteUrl: clean, hasWebsite: true, websiteExtractionStatus: "loading" });
    try {
      const res = await api.extractWebsite(clean, b.id);
      const next = applyAnalysis(res.data);
      const s = res.data.summary;
      track("onboarding_web_analyzed", {
        success: true,
        fieldsFound: s.completedFieldsCount,
        fieldsToReview: s.reviewFieldsCount,
      });
      const base =
        s.completedFieldsCount > 0
          ? `Eva detectó ${s.completedFieldsCount} campos${s.reviewFieldsCount ? ` y sugirió ${s.reviewFieldsCount} más` : ""}.`
          : "Eva no encontró datos en esa URL.";
      show(res.meta?.warning || base);
      routeAfterImport(next);
    } catch {
      set({ websiteExtractionStatus: "error" });
      track("onboarding_web_analyzed", { success: false });
      show("Eva no pudo leer la web. Probá con otra URL o completá a mano.");
    } finally {
      setWebLoading(false);
    }
  }

  // Importar el .md de una IA externa (pantalla IA).
  function loadExternalMd(md: string, fileName: string) {
    if (!md.trim()) {
      show("Subí el archivo .md o pegá el contenido primero.");
      return;
    }
    const res = parseExternalMarkdown(md);
    const next = applyAnalysis(res);
    track("onboarding_md_imported", {
      complete: isAnalysisComplete(res),
      missingFields: res.missingFields.length,
    });
    set({
      businessInfoImportSource: "external_ai_md",
      externalAiImport: {
        rawMarkdown: md,
        uploadedFileName: fileName || undefined,
        parsedAt: nowIso(),
        fieldStatuses: res.fieldStatuses,
        missingFields: res.missingFields,
        isCompleteEnoughForSummary: isAnalysisComplete(res),
      },
    });
    show("Importado. Eva completó lo que pudo de tu resumen.");
    routeAfterImport(next);
  }

  function goSummary() {
    setStep(SUMMARY_STEP);
    setPhase("wizard");
  }

  const subcats = useMemo(() => SUBCATEGORIES[b.industry] || [], [b.industry]);

  // Lleva al usuario directo al primer campo obligatorio incompleto: scrollea,
  // lo resalta y enfoca el control. Ver PLAN-v2 (navegación de obligatorios).
  function goToMissingField(id: string, label: string) {
    show(`Te falta completar "${label}". Te llevo ahí 👇`);
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const focusable = el.querySelector<HTMLElement>("input, select, textarea");
      focusable?.focus({ preventScroll: true });
    });
  }

  function tryNext() {
    const miss = getMissingRequiredFields(step, b);
    if (miss.length > 0) {
      setMissing(new Set(miss.map((m) => m.id)));
      track("onboarding_validation_failed", {
        step,
        label: STEPS[step],
        field: miss[0].id,
        missingCount: miss.length,
      });
      goToMissingField(miss[0].id, miss[0].label);
      return;
    }
    setMissing(new Set());
    track(
      "onboarding_step_completed",
      {
        step,
        label: STEPS[step],
        seconds: Math.round((Date.now() - stepStartedAt.current) / 1000),
      },
      { businessId: b.id }
    );
    if (step < SUMMARY_STEP) setStep(step + 1);
  }

  function finish() {
    // Gate (item 1): no se puede crear estrategia con obligatorios sin responder.
    // Cubre el hueco de web/IA/pendientes que saltaban al resumen sin revalidar.
    if (missingCritical(b).length > 0) {
      show("Faltan datos obligatorios para que Eva genere tu estrategia.");
      setCriticalOpen(true);
      return;
    }

    // Modo edición (item 25): solo guardar los cambios, sin regenerar estrategia.
    if (editMode) {
      const finalBiz = prepareFinalBusiness(b, user?.id || activeBusiness?.userId || "anon");
      useStore.getState().upsertBusiness(finalBiz);
      show("Cambios guardados ✓");
      router.push("/settings");
      return;
    }

    const finalBiz = prepareFinalBusiness(b, user?.id || "anon");

    // Onboarding completo (pasó el gate de críticos). Se trackea una sola
    // vez aunque el usuario vuelva a apretar tras cerrar el modal de signup.
    if (!completeTracked.current) {
      completeTracked.current = true;
      track(
        "onboarding_completed",
        {
          method: b.businessInfoImportSource ?? "manual",
          seconds: Math.round((Date.now() - onboardingStartedAt.current) / 1000),
        },
        { businessId: finalBiz.id }
      );
    }

    // Con Supabase: cuenta real obligatoria antes de generar estrategia.
    if (requiresAuthForStrategy()) {
      if (!canGenerateStrategy(user)) {
        setPendingBusiness(finalBiz);
        saveOnboardingDraft(finalBiz);
        setSignupOpen(true);
        track("onboarding_signup_modal_shown", {});
        return;
      }
      void completeOnboardingAndGoToStrategy(
        prepareFinalBusiness(b, user!.id),
        router
      );
      return;
    }

    // Modo local sin Supabase (dev/demo sin backend).
    if (!user) {
      login(`negocio_${Date.now()}@loca.app`);
      const localId = useStore.getState().user?.id;
      if (!localId) return;
      void completeOnboardingAndGoToStrategy(
        prepareFinalBusiness(b, localId),
        router
      );
      return;
    }

    void completeOnboardingAndGoToStrategy(finalBiz, router);
  }

  const onSummary = phase === "wizard" && step === SUMMARY_STEP;

  return (
    <main className="min-h-screen">
      {node}

      {/* ── Pantalla inicial: elección de método (sin stepper, sin footer, sin scroll) ── */}
      {phase === "select" && <MethodSelect onPick={pickMethod} />}

      {/* ── Pantalla Web (única, centrada) ── */}
      {phase === "web" && (
        <WebImportScreen
          initialUrl={b.websiteUrl || ""}
          loading={webLoading}
          onAnalyze={analyzeWeb}
          onBack={() => setPhase("select")}
        />
      )}

      {/* ── Pantalla IA externa (única, centrada) ── */}
      {phase === "ai" && (
        <AiImportScreen
          businessName={b.name}
          onLoad={loadExternalMd}
          onBack={() => setPhase("select")}
        />
      )}

      {/* ── Pantalla de pendientes (después de web/.md incompletos) ── */}
      {phase === "pending" && (
        <PendingScreen
          business={b}
          applyPatch={set}
          onEditSection={openSection}
          onSuggest={completeWithEva}
          onSummary={goSummary}
          onBack={() => setPhase("select")}
        />
      )}

      {/* ── Wizard manual (solo aquí aparecen pasos / stepper / footer) ── */}
      {phase === "wizard" && (
        <>
          <header className="sticky top-0 z-20 border-b border-border/70 bg-card/85 backdrop-blur-md">
            <div className="mx-auto max-w-3xl px-4 py-3 sm:px-6">
              <div className="flex items-center justify-between">
                <Link href="/">
                  <Logo className="text-xl" />
                </Link>
                <span className="text-sm font-semibold text-faint">
                  Paso {step} de {WIZARD_TOTAL} · <span className="text-foreground-muted">{STEPS[step]}</span>
                </span>
              </div>
              <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-loca-500 to-loca-400 transition-all duration-500"
                  style={{ width: `${(step / WIZARD_TOTAL) * 100}%` }}
                />
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-3xl px-4 py-8 pb-28 sm:px-6">
            {/* Stepper navegable (pasos 1..7) */}
            <div className="mb-7 flex items-center">
              {Array.from({ length: WIZARD_TOTAL }, (_, k) => k + 1).map((i, idx) => (
                <div key={i} className="flex flex-1 items-center">
                  <button
                    onClick={() => i <= step && setStep(i)}
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

            {!onSummary && (
              <>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">{STEPS[step]}</h1>
                <StepIntro step={step} />
              </>
            )}

            <div className="mt-5">
              {step === 1 && <StepBasic b={b} set={set} subcats={subcats} missing={missing} statusOf={statusOf} />}
              {step === 2 && <StepBrand b={b} set={set} missing={missing} statusOf={statusOf} />}
              {step === 3 && <StepBrandKit b={b} set={set} />}
              {step === 4 && <StepProducts b={b} set={set} show={show} />}
              {step === 5 && <StepAudience b={b} set={set} missing={missing} />}
              {step === 6 && <StepGoals b={b} set={set} missing={missing} />}
              {step === 7 && (
                <OnboardingSummary
                  business={b}
                  onConfirm={finish}
                  onEdit={() => setStep(1)}
                  onEditSection={openSection}
                  onCompleteWithEva={completeWithEva}
                  onFixCritical={() => setCriticalOpen(true)}
                  confirmLabel={editMode ? "Guardar cambios" : "Confirmar y preparar estrategia"}
                />
              )}
            </div>
          </div>

          {!onSummary && (
            <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/70 bg-card/90 backdrop-blur-md">
              <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
                <Button variant="ghost" size="lg" onClick={() => (step === 1 ? setPhase("select") : setStep(step - 1))}>
                  {step === 1 ? "Volver al inicio" : "Atrás"}
                </Button>
                <Button size="lg" onClick={tryNext}>
                  {step === SUMMARY_STEP - 1 ? "Ver resumen" : "Siguiente"} <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Faltantes críticos: flujo enfocado 1-de-N (campo por campo) */}
      <Modal open={criticalOpen} onClose={() => setCriticalOpen(false)} title="Falta este dato para tu estrategia">
        <PendingFlow
          business={b}
          questions={pendingQuestions(b).filter((q) => q.critical)}
          applyPatch={set}
          onSuggest={completeWithEva}
          onEditSection={(k) => {
            setCriticalOpen(false);
            openSection(k);
          }}
          onDone={() => setCriticalOpen(false)}
          doneLabel="Listo"
        />
      </Modal>

      {/* Edición enfocada de una sección (resumen y pendientes) */}
      <Modal open={!!editSection} onClose={cancelSection} title={sectionTitle(editSection)}>
        <SectionEditor section={editSection} b={b} set={set} subcats={subcats} show={show} />
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button variant="success" size="lg" className="flex-1" onClick={saveSection}>
            Guardar cambios
          </Button>
          <Button variant="ghost" size="lg" className="flex-1" onClick={cancelSection}>
            Cancelar
          </Button>
        </div>
      </Modal>

      {hasSupabaseClientConfig() && pendingBusiness && (
        <OnboardingSignupModal
          open={signupOpen}
          business={pendingBusiness}
          onClose={() => setSignupOpen(false)}
          router={router}
        />
      )}

      <EvaChatBubble raised={phase === "wizard"} />
    </main>
  );
}

function StepIntro({ step }: { step: number }) {
  const intros = [
    "Si tu negocio tiene una web, Eva puede leerla y completar gran parte del formulario por vos.",
    "Lo básico de tu negocio. No tiene que ser perfecto, podés cambiar todo después.",
    "Contanos cómo es tu marca y qué venís haciendo. Si no sabés algo, Eva te ayuda.",
    "Así Eva interpretó tu identidad visual. Revisá colores, tipografías y logos.",
    "Cargá tus productos o servicios más importantes. No hace falta todo el catálogo.",
    "¿A quién le hablás? Esto ayuda a Eva a afinar el contenido.",
    "Por último, qué querés lograr. Con esto Eva arma tu estrategia.",
  ];
  return <p className="mt-2 text-[15px] text-muted-foreground">{intros[step]}</p>;
}

// ── Paso 3: Identidad visual (Brand Kit) ─────────────────────
function StepBrandKit({ b, set }: { b: Business; set: (p: Partial<Business>) => void }) {
  const bk = b.brandKit || emptyBrandKit();
  const isProfessional = b.businessStage === "profesional_independiente" || b.businessType === "Marca personal";
  return (
    <div className="space-y-5">
      <BrandKitEditor business={b} brandKit={bk} onChange={(patch) => set({ brandKit: { ...bk, ...patch } })} />

      {/* Estilo visual de los contenidos (item 16) */}
      <Card className="space-y-4 rounded-3xl">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-foreground">Estilo visual de tus contenidos</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Elegí uno o varios estilos. Definen cómo Eva piensa y arma las imágenes.
          </p>
        </div>
        <VisualStylePicker value={b.visualStyles || []} onChange={(visualStyles) => set({ visualStyles })} />
      </Card>

      {/* Fotos de la persona — solo profesional independiente / marca personal (item 20) */}
      {isProfessional && (
        <Card id="personPhotos" className="scroll-mt-24 space-y-3 rounded-3xl border-2 border-loca-200">
          <div className="flex items-start gap-3">
            <span className="text-2xl leading-none">🧑‍💼</span>
            <div>
              <h3 className="text-lg font-bold tracking-tight text-foreground">Subí fotos tuyas (importante)</h3>
              <p className="mt-0.5 text-sm text-muted-foreground-2">
                Como sos vos la cara de la marca, Eva usa tus fotos reales para el contenido.
                <strong className="text-foreground-soft"> Nunca vamos a inventar una cara como si fueras vos.</strong>{" "}
                Subí varias, con distinta pose/fondo, bien nombradas.
              </p>
            </div>
          </div>
          <PhotoUploader
            photos={b.personPhotos || []}
            onChange={(personPhotos) => set({ personPhotos })}
            kind="person"
            ctaLabel="Subir mis fotos"
          />
        </Card>
      )}
    </div>
  );
}

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

function sectionTitle(s: SummarySectionKey | null): string {
  return s ? SECTION_TITLES[s] : "";
}

function SectionEditor({
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

// ─────────────────────────────────────────────────────────────
// PANTALLA INICIAL: elección de método (independiente del wizard)
// ─────────────────────────────────────────────────────────────
type StartMode = "ai" | "web" | "manual";

function MethodSelect({ onPick }: { onPick: (m: StartMode) => void }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden loca-hero-bg">
      <div className="loca-orb left-[-12%] top-[-10%] h-80 w-80 animate-orb-drift bg-loca-200/50" />
      <div className="loca-orb bottom-[-14%] right-[-10%] h-96 w-96 animate-orb-drift bg-lima-200/40" style={{ animationDelay: "-5s" }} />

      <div className="px-6 pt-7 sm:px-10">
        <Link href="/">
          <Logo className="text-2xl" />
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-6 sm:px-6">
        <div className="w-full max-w-3xl animate-fade-in-up">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-loca-500 to-loca-700 text-white shadow-lift animate-float ring-8 ring-loca-50">
              <Sparkles className="h-8 w-8" />
            </div>
            <h1 className="text-[2rem] font-extrabold tracking-tight text-foreground sm:text-[3rem] sm:leading-[1.03]">
              ¿Cómo querés que <span className="loca-gradient-text">Eva</span><br className="hidden sm:block" /> conozca tu negocio?
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
              Empezá con tu web o con una IA que ya conozca tu marca. Eva completa todo lo posible y vos solo revisás.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <MethodCard
              icon={Globe}
              badge="Lo más fácil"
              badgeTone="lima"
              title="Pegar mi web"
              desc="Eva lee tu sitio y completa marca, productos, servicios y datos clave. Vos solo revisás."
              cta="Leer mi web"
              onClick={() => onPick("web")}
            />
            <MethodCard
              icon={Bot}
              badge="Si ya usás IA"
              badgeTone="pink"
              title="Subir resumen de mi IA"
              desc="Copiá un prompt, pedile a ChatGPT, Claude o Gemini un .md y subilo en LOCA."
              cta="Usar mi IA"
              onClick={() => onPick("ai")}
            />
          </div>

          <button
            onClick={() => onPick("manual")}
            className="group mx-auto mt-5 flex w-full max-w-xl items-center gap-3 rounded-2xl border border-border bg-card/60 px-5 py-3.5 text-left transition hover:border-border-strong hover:bg-card sm:mt-6"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-muted-foreground">
              <Pencil className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground-muted">Prefiero completar manualmente</span>
              <span className="block text-xs text-faint">Paso a paso, con sugerencias de Eva cuando las necesites.</span>
            </span>
            <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-faint transition group-hover:text-foreground-muted">
              Completar a mano <ArrowRight className="h-4 w-4" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function MethodCard({
  icon: Icon,
  badge,
  badgeTone,
  title,
  desc,
  cta,
  onClick,
}: {
  icon: any;
  badge: string;
  badgeTone: "lima" | "pink";
  title: string;
  desc: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative flex h-full flex-col rounded-[1.75rem] border border-border/60 bg-card/90 p-7 text-left shadow-card backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-loca-200 hover:shadow-glow"
    >
      <span
        className={`absolute right-5 top-5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
          badgeTone === "lima" ? "bg-lima-100 dark:bg-lima-900/50 text-lima-700 dark:text-lima-300" : "bg-loca-100 dark:bg-accent-subtle-bg text-accent-subtle-fg"
        }`}
      >
        {badge}
      </span>
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-loca-50 to-loca-100 dark:from-accent-subtle-bg dark:to-accent-subtle-bg text-accent shadow-sm ring-1 ring-accent-subtle-ring/60 transition-all duration-300 group-hover:scale-105 group-hover:from-loca-500 group-hover:to-loca-700 group-hover:text-white group-hover:shadow-lift">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="mt-6 text-[1.35rem] font-bold leading-tight tracking-tight text-foreground">{title}</h3>
      <p className="mt-2 flex-1 text-[15px] leading-relaxed text-muted-foreground">{desc}</p>
      <span className="mt-6 inline-flex items-center gap-2 text-[15px] font-semibold text-accent">
        {cta}
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-subtle-bg transition-all duration-300 group-hover:bg-loca-600 group-hover:text-white">
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </span>
      </span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// PANTALLA WEB: input gigante de URL → analizar
// ─────────────────────────────────────────────────────────────
function WebImportScreen({
  initialUrl,
  loading,
  onAnalyze,
  onBack,
}: {
  initialUrl: string;
  loading: boolean;
  onAnalyze: (url: string) => void;
  onBack: () => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden loca-hero-bg">
      <div className="loca-orb left-[-10%] top-[-8%] h-80 w-80 animate-orb-drift bg-loca-200/50" />
      <div className="loca-orb bottom-[-14%] right-[-8%] h-80 w-80 animate-orb-drift bg-lima-200/40" style={{ animationDelay: "-5s" }} />

      <div className="flex items-center justify-between px-6 pt-7 sm:px-10">
        <Link href="/">
          <Logo className="text-2xl" />
        </Link>
        {!loading && (
          <button onClick={onBack} className="flex items-center gap-1 text-sm font-semibold text-faint transition hover:text-foreground-muted">
            <ArrowLeft className="h-4 w-4" /> Volver
          </button>
        )}
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-6 sm:px-6">
        {loading ? (
          <div className="w-full max-w-xl animate-fade-in-up">
            <EvaLoading messages={EVA_THINKING_WEB} />
          </div>
        ) : (
          <div className="w-full max-w-xl animate-fade-in-up text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-loca-500 to-loca-700 text-white shadow-lift ring-8 ring-loca-50">
              <Globe className="h-8 w-8" />
            </div>
            <h1 className="text-[2rem] font-extrabold tracking-tight text-foreground sm:text-[2.6rem] sm:leading-[1.05]">
              Pegá la web de tu negocio
            </h1>
            <p className="mx-auto mt-3 max-w-md text-[15px] text-muted-foreground sm:text-base">
              Eva va a leer tu sitio y detectar tu marca, productos, servicios y datos clave. Lo que no encuentre, queda pendiente.
            </p>

            <div className="mt-8 rounded-[1.75rem] border border-border/50 bg-card p-6 shadow-card sm:p-7">
              <div className="relative">
                <Globe className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-loca-400" />
                <input
                  autoFocus
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onAnalyze(url);
                  }}
                  placeholder="https://tumarca.com"
                  className="loca-input h-[4.5rem] rounded-2xl pl-14 text-center text-lg sm:text-xl"
                />
              </div>
              <Button size="xl" className="mt-4 w-full" onClick={() => onAnalyze(url)}>
                <Sparkles className="h-5 w-5" /> Analizar mi web
              </Button>
            </div>

            <p className="mx-auto mt-4 max-w-md text-[13px] text-faint">
              No inventamos precios ni datos sensibles. Si algo no aparece en tu web, te lo vamos a pedir después.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PANTALLA IA EXTERNA: prompt + subir/pegar .md
// ─────────────────────────────────────────────────────────────
function AiImportScreen({
  businessName,
  onLoad,
  onBack,
}: {
  businessName: string;
  onLoad: (md: string, fileName: string) => void;
  onBack: () => void;
}) {
  const [md, setMd] = useState("");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const prompt = externalAiPrompt(businessName);
  const { show, node } = useToast();

  async function copyPrompt() {
    const ok = await copyToClipboard(prompt);
    show(ok ? "Prompt copiado. Pegalo en tu IA." : "No se pudo copiar");
  }
  async function onFile(file: File) {
    setMd(await file.text());
    setFileName(file.name);
  }
  async function handleLoad() {
    if (!md.trim()) {
      show("Subí el archivo .md o pegá el contenido primero.");
      return;
    }
    setLoading(true);
    const started = Date.now();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    const minMs = 1200;
    const elapsed = Date.now() - started;
    if (elapsed < minMs) await new Promise((r) => setTimeout(r, minMs - elapsed));
    onLoad(md, fileName);
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden loca-hero-bg">
      {node}
      <div className="loca-orb left-[-10%] top-[-8%] h-80 w-80 animate-orb-drift bg-loca-200/50" />
      <div className="loca-orb bottom-[-14%] right-[-8%] h-80 w-80 animate-orb-drift bg-lima-200/40" style={{ animationDelay: "-5s" }} />

      <div className="flex items-center justify-between px-6 pt-7 sm:px-10">
        <Link href="/">
          <Logo className="text-2xl" />
        </Link>
        {!loading && (
          <button onClick={onBack} className="flex items-center gap-1 text-sm font-semibold text-faint transition hover:text-foreground-muted">
            <ArrowLeft className="h-4 w-4" /> Volver
          </button>
        )}
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-6 sm:px-6">
        {loading ? (
          <div className="w-full max-w-xl animate-fade-in-up">
            <EvaLoading messages={EVA_THINKING_MD} />
          </div>
        ) : (
        <div className="w-full max-w-xl animate-fade-in-up">
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-loca-500 to-loca-700 text-white shadow-lift ring-8 ring-loca-50">
              <Bot className="h-8 w-8" />
            </div>
            <h1 className="text-[2rem] font-extrabold tracking-tight text-foreground sm:text-[2.4rem] sm:leading-[1.05]">
              Usá una IA que ya te conoce
            </h1>
            <p className="mx-auto mt-3 max-w-md text-[15px] text-muted-foreground">
              Tres pasos: copiá el prompt, pegalo en tu IA y subí el archivo que te devuelva.
            </p>
          </div>

          <div className="mt-7 space-y-5 rounded-[1.75rem] border border-border/50 bg-card p-6 shadow-card sm:p-7">
            {/* Paso 1 */}
            <div className="flex gap-4">
              <StepDot n={1} />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-foreground">Copiá el prompt</p>
                <p className="text-[13px] text-muted-foreground">Lo necesitás para pedirle a tu IA el resumen.</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button size="lg" className="flex-1" onClick={copyPrompt}>
                    <Copy className="h-4 w-4" /> Copiar prompt
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="flex-1"
                    onClick={() => downloadFile("loca-resumen-negocio.md", emptyMdTemplate(), "text/markdown")}
                  >
                    <Download className="h-4 w-4" /> Plantilla
                  </Button>
                </div>
              </div>
            </div>

            {/* Paso 2 */}
            <div className="flex gap-4 border-t border-border-subtle pt-5">
              <StepDot n={2} />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-foreground">Pegalo en tu IA</p>
                <p className="text-[13px] text-muted-foreground">
                  ChatGPT, Claude o Gemini. Pedile un archivo <span className="font-semibold text-foreground-muted">.md</span> o un bloque de código Markdown copiable. No PDF, Word ni Google Docs.
                </p>
              </div>
            </div>

            {/* Paso 3 */}
            <div className="flex gap-4 border-t border-border-subtle pt-5">
              <StepDot n={3} />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-foreground">Subí o pegá el .md</p>
                <button
                  onClick={() => fileInput.current?.click()}
                  className="mt-3 flex w-full flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed border-border bg-surface-subtle/40 px-4 py-6 text-center transition hover:border-loca-300 hover:bg-accent-subtle-bg/40"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-subtle-bg text-loca-500">
                    <Upload className="h-5 w-5" />
                  </span>
                  <span className="mt-1 text-sm font-semibold text-foreground-muted">Subí el archivo .md</span>
                  {fileName ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-300"><FileText className="h-3 w-3" /> {fileName}</span>
                  ) : (
                    <span className="text-xs text-faint">o pegá el contenido abajo</span>
                  )}
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  accept=".md,.markdown,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onFile(f);
                    e.target.value = "";
                  }}
                />
                <Textarea
                  value={md}
                  onChange={(e) => setMd(e.target.value)}
                  placeholder="o pegá acá el Markdown que te devolvió tu IA…"
                  className="mt-3 min-h-[90px] text-xs"
                />
              </div>
            </div>

            <Button size="xl" className="w-full" onClick={() => void handleLoad()}>
              <Sparkles className="h-5 w-5" /> Cargar información
            </Button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

// Número de paso (chip) para el flujo de IA externa.
function StepDot({ n }: { n: number }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-loca-500 to-loca-700 text-sm font-bold text-white shadow-sm">
      {n}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// PANTALLA DE PENDIENTES: asistente enfocado 1-de-N (web/.md)
// ─────────────────────────────────────────────────────────────
function PendingScreen({
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
  // Congelamos la lista al entrar para poder caminarla "1 de N" sin que se reordene.
  const [questions] = useState(() => pendingQuestions(business));

  return (
    <div className="relative min-h-screen overflow-hidden loca-hero-bg">
      <div className="loca-orb left-[-12%] top-[-8%] h-80 w-80 animate-orb-drift bg-loca-200/45" />
      <div className="loca-orb bottom-[-14%] right-[-10%] h-80 w-80 animate-orb-drift bg-lima-200/35" style={{ animationDelay: "-5s" }} />

      <div className="flex items-center justify-between px-6 pt-7 sm:px-10">
        <Link href="/">
          <Logo className="text-2xl" />
        </Link>
        <button onClick={onBack} className="flex items-center gap-1 text-sm font-semibold text-faint transition hover:text-foreground-muted">
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>
      </div>

      <div className="mx-auto max-w-xl animate-fade-in-up px-4 py-9 sm:px-6">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-loca-500 to-loca-700 text-white shadow-lift ring-8 ring-loca-50">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-[1.7rem] font-extrabold tracking-tight text-foreground sm:text-[2.1rem] sm:leading-[1.1]">
            Eva ya completó gran parte.<br className="hidden sm:block" /> Revisemos <span className="loca-gradient-text">lo que falta</span>.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] text-muted-foreground">
            Completá solo lo necesario, de a una pregunta por vez.
          </p>
        </div>

        <PendingFlow
          business={business}
          questions={questions}
          applyPatch={applyPatch}
          onSuggest={onSuggest}
          onEditSection={onEditSection}
          onDone={onSummary}
          doneLabel="Ver el resumen de mi negocio"
        />

        <div className="mt-5 text-center">
          <button onClick={onSummary} className="text-sm font-semibold text-faint transition hover:text-foreground-muted">
            Saltar y ver el resumen
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Paso 1: Negocio ──────────────────────────────────────────
function StepBasic({
  b,
  set,
  subcats,
  missing,
  statusOf,
}: {
  b: Business;
  set: (p: Partial<Business>) => void;
  subcats: string[];
  missing: Set<string>;
  statusOf: (f: string) => FieldStatusKind | undefined;
}) {
  return (
    <Card className="space-y-5">
      <HelpField label="Nombre de la empresa" required error={missing.has("name")} id="name" status={statusOf("name")}>
        <Input value={b.name} onChange={(e) => set({ name: e.target.value })} placeholder="Café Bruma" />
      </HelpField>

      <div className="grid gap-4 sm:grid-cols-2">
        <HelpField label="Industria" required error={missing.has("industry")} id="industry" status={statusOf("industry")}>
          <Select value={b.industry} onChange={(e) => set({ industry: e.target.value, subcategory: "" })}>
            <option value="">Elegí una industria</option>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </Select>
        </HelpField>
        <HelpField label="Subcategoría" required error={missing.has("subcategory")} id="subcategory" help="Elegí la opción más parecida. No tiene que ser perfecta." status={statusOf("subcategory")}>
          {subcats.length ? (
            <Select value={b.subcategory} onChange={(e) => set({ subcategory: e.target.value })}>
              <option value="">Elegí una subcategoría</option>
              {subcats.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          ) : (
            <Input value={b.subcategory} onChange={(e) => set({ subcategory: e.target.value })} placeholder="Ej: Café" />
          )}
        </HelpField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <HelpField label="Tipo de negocio" required error={missing.has("businessType")} id="businessType" status={statusOf("businessType")}>
          <Select value={b.businessType} onChange={(e) => set({ businessType: e.target.value })}>
            <option value="">Elegí</option>
            {BUSINESS_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </HelpField>
        <HelpField label="Modelo de negocio">
          <Select value={b.businessModel} onChange={(e) => set({ businessModel: e.target.value as any })}>
            <option value="B2C">Le vendo a personas (B2C)</option>
            <option value="B2B">Le vendo a empresas (B2B)</option>
            <option value="Ambos">A ambos</option>
          </Select>
        </HelpField>
      </div>

      <HelpField
        label="Tipo de organización"
        required
        error={missing.has("businessStage")}
        id="businessStage"
        help="Nos ayuda a pedirte la info y generar el contenido adecuado para tu caso."
        status={statusOf("businessStage")}
      >
        <Select
          value={b.businessStage || ""}
          onChange={(e) => set({ businessStage: (e.target.value || undefined) as Business["businessStage"] })}
        >
          <option value="">Elegí</option>
          {BUSINESS_STAGES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label} — {s.help}
            </option>
          ))}
        </Select>
      </HelpField>

      <div className="grid gap-4 sm:grid-cols-2">
        <HelpField label="Año de fundación" required error={missing.has("yearFounded")} id="yearFounded">
          <Select value={b.yearFounded} onChange={(e) => set({ yearFounded: e.target.value })}>
            {foundingYearOptions(CURRENT_YEAR).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </HelpField>
        <HelpField label="Cantidad de empleados" required error={missing.has("employees")} id="employees">
          <Select value={b.employees} onChange={(e) => set({ employees: e.target.value })}>
            <option value="">Elegí</option>
            {["Solo yo", "1-10", "11-50", "51-200", "200+"].map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </Select>
        </HelpField>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <HelpField label="País" required error={missing.has("country")} id="country" status={statusOf("country")}>
          <SearchableCountrySelect
            value={b.country}
            onChange={(v) => set({ country: v, state: "" })}
            error={missing.has("country")}
          />
        </HelpField>
        <HelpField label="Provincia / Estado" required error={missing.has("state")} id="state">
          <SearchableRegionSelect country={b.country} value={b.state} onChange={(v) => set({ state: v })} />
        </HelpField>
        <HelpField label="Ciudad" required error={missing.has("city")} id="city">
          <Input value={b.city} onChange={(e) => set({ city: e.target.value })} placeholder="Buenos Aires" />
        </HelpField>
      </div>
    </Card>
  );
}

// ── Paso 2: Marca ────────────────────────────────────────────
function StepBrand({
  b,
  set,
  missing,
  statusOf,
}: {
  b: Business;
  set: (p: Partial<Business>) => void;
  missing: Set<string>;
  statusOf: (f: string) => FieldStatusKind | undefined;
}) {
  const suggest = (field: "shortDescription" | "fullDescription") =>
    set({ [field]: getFieldExample(field, b.industry) } as any);

  const activitiesHasOther = b.marketingActivities.includes("Otro");
  const seasonalityHasOther = b.seasonalityTags.includes("Otra");
  const datesHasOther = b.specialDates.includes("Otra");

  // Sugerencias por industria: se muestran las estáticas al instante y,
  // si el catálogo en Supabase difiere (se puede editar sin redeploy),
  // se actualizan en segundo plano. Si no hay Supabase o falla, se quedan
  // las estáticas (mismo resultado).
  const [dateOptions, setDateOptions] = useState(() => ({
    seasonality: seasonalityOptionsFor(b.industry),
    specialDates: specialDatesOptionsFor(b.industry),
  }));
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/special-dates?industry=${encodeURIComponent(b.industry)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled && json) setDateOptions(json);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [b.industry]);

  return (
    <Card className="space-y-5">
      <HelpField
        label="Descripción corta"
        required
        error={missing.has("shortDescription")}
        id="shortDescription"
        status={statusOf("shortDescription")}
        hint={`${b.shortDescription.length}/280`}
      >
        <div className="space-y-2">
          <Textarea
            maxLength={280}
            value={b.shortDescription}
            onChange={(e) => set({ shortDescription: e.target.value })}
            placeholder={getFieldExample("shortDescription", b.industry)}
          />
          <EvaSuggestionButton label="Que Eva lo sugiera" onClick={() => suggest("shortDescription")} />
        </div>
      </HelpField>

      <HelpField label="Descripción completa" required error={missing.has("fullDescription")} id="fullDescription" help="Mientras más claro seas, mejores contenidos va a generar Eva." status={statusOf("fullDescription")}>
        <div className="space-y-2">
          <Textarea
            value={b.fullDescription}
            onChange={(e) => set({ fullDescription: e.target.value })}
            placeholder={getFieldExample("fullDescription", b.industry)}
          />
          <EvaSuggestionButton label="Que Eva lo sugiera" onClick={() => suggest("fullDescription")} />
        </div>
      </HelpField>

      <HelpField label="Valores de marca (hasta 5)" required error={missing.has("values")} id="values">
        <ChipSelect options={VALUE_SUGGESTIONS} value={b.values} onChange={(v) => set({ values: v.slice(0, 5) })} allowCustom />
      </HelpField>

      <HelpField
        label="Ventaja competitiva"
        required
        error={missing.has("competitiveAdvantages")}
        id="competitiveAdvantages"
        status={statusOf("competitiveAdvantages")}
        help={getFieldExample("competitiveAdvantage", b.industry)}
      >
        <ChipSelect
          options={ADVANTAGE_SUGGESTIONS}
          value={b.competitiveAdvantages}
          onChange={(v) => set({ competitiveAdvantages: v })}
          allowCustom
        />
      </HelpField>

      <HelpField
        label="Canales actuales"
        required
        error={missing.has("marketingChannels")}
        id="marketingChannels"
        status={statusOf("marketingChannels")}
        help="¿Dónde está hoy tu negocio? Elegí los que uses (o “Ninguno”)."
      >
        <ChannelSelector value={b.marketingChannels} onChange={(v) => set({ marketingChannels: v })} />
      </HelpField>

      <HelpField
        label="¿Qué venís haciendo de marketing?"
        required
        error={missing.has("marketingActivities")}
        id="marketingActivities"
        help="Elegí todo lo que apliquen. Si no hacés nada todavía, está perfecto."
      >
        <OptionCards
          multi
          columns={2}
          options={MARKETING_ACTIVITIES.map((a) => ({ value: a, label: a }))}
          value={b.marketingActivities}
          onChange={(v) => set({ marketingActivities: v })}
        />
        {activitiesHasOther && (
          <Input
            className="mt-2"
            value={b.marketingStrategy}
            onChange={(e) => set({ marketingStrategy: e.target.value })}
            placeholder="Contanos qué otra cosa hacés…"
          />
        )}
      </HelpField>

      <HelpField label="¿Tu negocio tiene temporadas fuertes?" required error={missing.has("hasSeasonality")} id="hasSeasonality">
        <YesNoChoice value={b.hasSeasonality} onChange={(v) => set({ hasSeasonality: v })} />
        {b.hasSeasonality && (
          <div className="mt-3">
            <OptionCards
              multi
              columns={3}
              options={dateOptions.seasonality.map((s) => ({ value: s, label: s }))}
              value={b.seasonalityTags}
              onChange={(v) => set({ seasonalityTags: v })}
            />
            {seasonalityHasOther && (
              <Input
                className="mt-2"
                value={b.seasonality}
                onChange={(e) => set({ seasonality: e.target.value })}
                placeholder="¿Qué otra temporada?"
              />
            )}
          </div>
        )}
      </HelpField>

      <HelpField label="¿Hay fechas especiales importantes para tu negocio?" required error={missing.has("hasSpecialDates")} id="hasSpecialDates">
        <YesNoChoice value={b.hasSpecialDates} onChange={(v) => set({ hasSpecialDates: v })} />
        {b.hasSpecialDates && (
          <div className="mt-3">
            <OptionCards
              multi
              columns={2}
              options={dateOptions.specialDates.map((s) => ({ value: s, label: s }))}
              value={b.specialDates}
              onChange={(v) => set({ specialDates: v })}
            />
            {datesHasOther && (
              <Input
                className="mt-2"
                value={b.seasonality}
                onChange={(e) => set({ seasonality: e.target.value })}
                placeholder="¿Qué otra fecha?"
              />
            )}
          </div>
        )}
      </HelpField>
    </Card>
  );
}

// ── Paso 3: Productos / Servicios ────────────────────────────
function emptyPS(type: ProductServiceType): ProductService {
  return {
    id: uid("ps"),
    type,
    name: "",
    category: "",
    subcategory: "",
    shortDescription: "",
    longDescription: "",
    features: [],
    variants: [],
    pricingType: "fijo",
    currency: "ARS",
    priceMin: undefined,
    priceMax: undefined,
    imageCaption: "",
    keywords: [],
    negativeKeywords: [],
    isTopSeller: false,
    saved: false,
    importSource: "manual",
  };
}

function StepProducts({
  b,
  set,
  show,
}: {
  b: Business;
  set: (p: Partial<Business>) => void;
  show: (m: string) => void;
}) {
  const items = b.productsServices;
  const [editingId, setEditingId] = useState<string | null>(null);

  const update = (id: string, patch: Partial<ProductService>) =>
    set({ productsServices: items.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  const remove = (id: string) => {
    set({ productsServices: items.filter((x) => x.id !== id) });
    if (editingId === id) setEditingId(null);
  };
  const add = (type: ProductServiceType) => {
    const ps = emptyPS(type);
    set({ productsServices: [...items, ps] });
    setEditingId(ps.id);
  };
  const save = (id: string) => {
    update(id, { saved: true });
    setEditingId(null);
    show("Guardado ✓");
  };
  const addMany = (list: ProductService[]) => set({ productsServices: [...items, ...list] });

  // Sugerencias seguras por industria (marcadas como sugeridas, sin precio).
  const suggestByEva = () => {
    const base = getFieldExample("productName", b.industry) || "Producto principal";
    addMany([
      { ...emptyPS("producto"), name: base, saved: true, importSource: "eva", confidence: "low", shouldReview: true },
      { ...emptyPS("servicio"), name: "Servicio principal", saved: true, importSource: "eva", confidence: "low", shouldReview: true },
    ]);
    show("Eva sugirió algunos. Revisalos y editá nombres/precios.");
  };
  const useExamples = () => {
    addMany([
      {
        ...emptyPS("producto"),
        name: getFieldExample("productName", b.industry) || "Producto",
        shortDescription: getFieldExample("productShort", b.industry),
        saved: true,
        importSource: "eva",
        shouldReview: true,
      },
    ]);
    show("Cargamos un ejemplo de tu industria. Editalo con tus datos.");
  };

  const detected = items.some((x) => x.importSource && x.importSource !== "manual");

  return (
    <div id="products" className="scroll-mt-24 space-y-4">
      {/* Cartel destacado (item 18) */}
      <div className="flex items-start gap-3 rounded-2xl border-2 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4">
        <span className="text-2xl leading-none">📸</span>
        <p className="text-sm font-bold uppercase leading-snug tracking-wide text-amber-900">
          Si vendés productos, es fundamental que subas fotos bien nombradas para crear contenido de mayor valor.
        </p>
      </div>

      <p className="rounded-lg bg-surface-subtle p-3 text-sm text-muted-foreground">
        {detected
          ? "Eva detectó estos productos/servicios. Revisalos rápido: podés editar, eliminar o sumar otros. No agregamos precios si no aparecen en tu web."
          : "No hace falta cargar todo tu catálogo. Empezá por tus productos o servicios más importantes."}
      </p>

      {/* Estado vacío: acciones rápidas */}
      {items.length === 0 && (
        <div className="rounded-xl border border-dashed border-border-strong p-4 text-center">
          <p className="text-sm text-muted-foreground">No pudimos detectar productos o servicios con seguridad.</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Button size="sm" variant="outline" onClick={suggestByEva}>
              <Sparkles className="h-4 w-4" /> Que Eva sugiera según mi negocio
            </Button>
            <Button size="sm" variant="outline" onClick={() => add("producto")}>
              <Plus className="h-4 w-4" /> Agregar manualmente
            </Button>
            <Button size="sm" variant="ghost" onClick={useExamples}>
              Usar ejemplos de mi industria
            </Button>
          </div>
        </div>
      )}

      <ProductServiceImporter
        onImport={(imported) => {
          set({ productsServices: [...items, ...imported] });
          show(`Eva detectó ${imported.length} ítems. Podés editarlos antes de seguir.`);
        }}
      />

      {items.map((ps) =>
        ps.saved && editingId !== ps.id ? (
          <ProductServiceCard
            key={ps.id}
            ps={ps}
            onEdit={() => setEditingId(ps.id)}
            onRemove={() => remove(ps.id)}
          />
        ) : (
          <ProductServiceForm
            key={ps.id}
            business={b}
            ps={ps}
            onChange={(patch) => update(ps.id, patch)}
            onSave={() => save(ps.id)}
            onRemove={() => remove(ps.id)}
            onToast={show}
          />
        )
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => add("producto")}>
          <Plus className="h-4 w-4" /> Agregar {items.length ? "otro " : ""}producto
        </Button>
        <Button size="sm" variant="outline" onClick={() => add("servicio")}>
          <Plus className="h-4 w-4" /> Agregar {items.length ? "otro " : ""}servicio
        </Button>
      </div>
    </div>
  );
}

// ── Paso 4: Audiencia ────────────────────────────────────────
function StepAudience({
  b,
  set,
  missing,
}: {
  b: Business;
  set: (p: Partial<Business>) => void;
  missing: Set<string>;
}) {
  const a = b.audience;
  const setA = (patch: Partial<Business["audience"]>) => set({ audience: { ...a, ...patch } });
  return (
    <Card className="space-y-5">
      <HelpField label="Rango de edad" required error={missing.has("ageRanges")} id="ageRanges">
        <ChipSelect options={AGE_RANGES} value={a.ageRanges} onChange={(v) => setA({ ageRanges: v })} />
      </HelpField>

      <div className="grid gap-4 sm:grid-cols-2">
        <HelpField label="Género">
          <OptionCards
            columns={2}
            options={GENDER_OPTIONS}
            value={a.gender}
            onChange={(v) => setA({ gender: v })}
          />
        </HelpField>
        <HelpField label="Nivel socioeconómico">
          <Select value={a.socioeconomicLevel} onChange={(e) => setA({ socioeconomicLevel: e.target.value as any })}>
            <option value="alto">Alto</option>
            <option value="medio_alto">Medio-alto</option>
            <option value="medio">Medio</option>
            <option value="bajo">Bajo</option>
          </Select>
        </HelpField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <HelpField label="¿Dónde está tu cliente?">
          <Select value={a.locationLogic} onChange={(e) => setA({ locationLogic: e.target.value as any })}>
            <option value="ciudad">En mi ciudad</option>
            <option value="pais">En todo el país</option>
            <option value="regional">En la región</option>
            <option value="global">En todo el mundo</option>
          </Select>
        </HelpField>
        <HelpField label="Ubicaciones objetivo" required error={missing.has("locations")} id="locations">
          <ChipSelect options={[]} value={a.locations} onChange={(v) => setA({ locations: v })} allowCustom />
        </HelpField>
      </div>

      <HelpField label="¿Qué problema le resolvés?" required error={missing.has("painPoints")} id="painPoints" help={getFieldExample("painPoint", b.industry)}>
        <ChipSelect options={[]} value={a.painPoints} onChange={(v) => setA({ painPoints: v })} allowCustom />
      </HelpField>

      <HelpField label="¿Cómo se comporta tu cliente?" required error={missing.has("behavior")} id="behavior">
        <Textarea
          value={a.behavior}
          onChange={(e) => setA({ behavior: e.target.value })}
          placeholder={getFieldExample("behavior", b.industry)}
        />
      </HelpField>

      <HelpField label="Segmentos de audiencia" required error={missing.has("segments")} id="segments">
        <ChipSelect options={[]} value={a.segments} onChange={(v) => setA({ segments: v })} allowCustom />
      </HelpField>
    </Card>
  );
}

// ── Paso 5: Objetivos ────────────────────────────────────────
function StepGoals({
  b,
  set,
  missing,
}: {
  b: Business;
  set: (p: Partial<Business>) => void;
  missing: Set<string>;
}) {
  const g = b.goals;
  const setG = (patch: Partial<Business["goals"]>) => set({ goals: { ...g, ...patch } });
  return (
    <Card className="space-y-5">
      <HelpField label="¿Qué buscás principalmente?" required error={missing.has("primaryContentGoal")} id="primaryContentGoal">
        <OptionCards
          columns={3}
          options={[
            { value: "visibilidad", label: "Visibilidad", desc: "Que me conozcan más" },
            { value: "ventas", label: "Ventas", desc: "Vender más" },
            { value: "confianza", label: "Confianza", desc: "Que confíen en mí" },
          ]}
          value={g.primaryContentGoal}
          onChange={(v) => setG({ primaryContentGoal: v })}
        />
      </HelpField>

      {g.primaryContentGoal === "ventas" && (
        <HelpField label="¿Qué tipo de venta?">
          <OptionCards
            columns={2}
            options={[
              { value: "compra_ecommerce", label: "Compra online" },
              { value: "mensaje_whatsapp", label: "Mensaje / WhatsApp" },
              { value: "visita_local", label: "Visita al local" },
              { value: "lead_magnet", label: "Conseguir contactos (leads)" },
            ]}
            value={g.salesGoalType || ""}
            onChange={(v) => setG({ salesGoalType: v })}
          />
        </HelpField>
      )}

      <HelpField label="¿Qué querés lograr con tu negocio?" required error={missing.has("businessObjectives")} id="businessObjectives">
        <Textarea
          value={g.businessObjectives}
          onChange={(e) => setG({ businessObjectives: e.target.value })}
          placeholder={getFieldExample("businessObjectives", b.industry)}
        />
      </HelpField>

      <HelpField label="¿Cómo vas a medir el éxito?" required error={missing.has("successMetrics")} id="successMetrics">
        <ChipSelect
          options={["Ventas", "Alcance", "Seguidores", "Visitas al local", "Mensajes", "Conversión"]}
          value={g.successMetrics}
          onChange={(v) => setG({ successMetrics: v })}
          allowCustom
        />
      </HelpField>

      <HelpField label="¿Qué querés lograr con tu marketing?" required error={missing.has("marketingObjectives")} id="marketingObjectives">
        <Textarea
          value={g.marketingObjectives}
          onChange={(e) => setG({ marketingObjectives: e.target.value })}
          placeholder={getFieldExample("marketingObjectives", b.industry)}
        />
      </HelpField>

      <HelpField label="¿En cuánto tiempo?" required error={missing.has("timeline")} id="timeline">
        <Select value={g.timeline} onChange={(e) => setG({ timeline: e.target.value })}>
          <option value="">Elegí</option>
          <option value="Próximo mes">Próximo mes</option>
          <option value="Próximos 3 meses">Próximos 3 meses</option>
          <option value="Próximos 6 meses">Próximos 6 meses</option>
          <option value="Este año">Este año</option>
        </Select>
      </HelpField>
    </Card>
  );
}
