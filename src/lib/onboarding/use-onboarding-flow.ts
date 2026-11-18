// ─────────────────────────────────────────────────────────────
// Lógica del onboarding (sin JSX): fase, paso, negocio en edición, ruteo
// después del análisis, gates de finalización, borrador, modales y analytics.
// La página solo compone pantallas con lo que devuelve este hook.
// ─────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { emptyBusiness } from "@/lib/business-defaults";
import { canGenerateStrategy, requiresAuthForStrategy } from "@/lib/auth/user";
import { completeOnboardingAndGoToStrategy, prepareFinalBusiness, resumeOnboardingDraftIfAny } from "@/lib/onboarding/complete";
import { saveOnboardingDraft } from "@/lib/onboarding-draft";
import { SUBCATEGORIES } from "@/lib/constants";
import type { Business, FieldStatusKind, WebsiteAnalysis } from "@/lib/types";
import { useToast } from "@/components/ui";
import { missingCritical } from "@/components/onboarding-summary";
import { QUESTIONS, missingRequiredQuestions } from "@/lib/business-questions";
import { syncFieldConfigOverrides } from "@/lib/onboarding/field-config-client";
import { getMissingRequiredFields } from "@/lib/onboarding-validation";
import { applyAnalysisToBusiness } from "@/lib/onboarding/apply-analysis";
import { logExternalMdImport, reportManualCompletion } from "@/lib/onboarding/analysis-log-client";
import { SUMMARY_STEP, stepLabel, type Phase } from "@/lib/onboarding/steps";
import type { SummarySectionKey } from "@/lib/onboarding/sections";
import type { StartMode } from "@/components/onboarding/method-select";
import { api } from "@/lib/api";
import { nowIso } from "@/lib/utils";
import { parseExternalMarkdown, isAnalysisComplete } from "@/lib/md-import";
import { suggestPending } from "@/lib/eva-suggest";
import { track } from "@/lib/analytics";

export function useOnboardingFlow() {
  const router = useRouter();
  const user = useStore((s) => s.user);
  const hydrated = useStore((s) => s.hydrated);
  const login = useStore((s) => s.login);
  const { show, node: toastNode } = useToast();

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
  // Config del backoffice (qué campos son obligatorios/críticos): se baja una
  // vez y se aplica en memoria. Sin backoffice o sin red, defaults de código.
  useEffect(() => {
    syncFieldConfigOverrides();
  }, []);
  useEffect(() => {
    if (phase !== "wizard" || editMode) return;
    stepStartedAt.current = Date.now();
    track("onboarding_step_viewed", { step, label: stepLabel(step) });
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
  // Devuelve el negocio resultante para poder decidir el ruteo (resumen vs
  // pendientes). El merge vive en apply-analysis.ts (compartido con el log de
  // calidad del backoffice, que computa lo mismo server-side).
  function applyAnalysis(a: WebsiteAnalysis): Business {
    let computed: Business | null = null;
    setB((prev) => {
      computed = applyAnalysisToBusiness(prev, a);
      return computed;
    });
    return computed ?? b;
  }

  // Qué obligatorios quedaron faltando justo DESPUÉS del análisis: al terminar
  // el onboarding se compara contra el estado final para avisarle al log de
  // calidad qué completó el usuario a mano (cierre del funnel por campo).
  const missingAfterAnalysis = useRef<string[] | null>(null);
  const manualCompletionLogged = useRef(false);

  function reportManualCompletionOnce(finalBiz: Business) {
    if (manualCompletionLogged.current || !missingAfterAnalysis.current?.length) return;
    const completed = missingAfterAnalysis.current.filter((id) => {
      const q = QUESTIONS.find((x) => x.id === id);
      return q && !q.isMissing(finalBiz);
    });
    if (!completed.length) return;
    manualCompletionLogged.current = true;
    reportManualCompletion(finalBiz.id, completed);
  }

  // Decide a dónde ir después de analizar web / importar .md.
  // Suficiente info → resumen final. Faltan datos clave → pantalla de pendientes.
  function routeAfterImport(next: Business) {
    missingAfterAnalysis.current = missingRequiredQuestions(next).map((q) => q.id);
    // Todos los obligatorios completos → resumen. Si falta alguno → pantalla
    // "Completá lo que falta" (solo los campos vacíos, agrupados).
    if (missingRequiredQuestions(next).length === 0) {
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
      // Config fresca ANTES de decidir qué campos pedir: si el admin tocó un
      // toggle recién, el flujo de pendientes tiene que reflejarlo.
      await syncFieldConfigOverrides(true);
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
    void syncFieldConfigOverrides(true); // refresco en paralelo (parse local, no bloquea)
    const next = applyAnalysis(res);
    track("onboarding_md_imported", {
      complete: isAnalysisComplete(res),
      missingFields: res.missingFields.length,
    });
    logExternalMdImport(b.id, fileName, res);
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
        label: stepLabel(step),
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
        label: stepLabel(step),
        seconds: Math.round((Date.now() - stepStartedAt.current) / 1000),
      },
      { businessId: b.id }
    );
    if (step < SUMMARY_STEP) setStep(step + 1);
  }

  function finish() {
    // Modo edición (item 25): solo guardar los cambios, sin regenerar estrategia.
    // Gate indulgente (solo críticos), como antes: editar no exige completar todo.
    if (editMode) {
      if (missingCritical(b).length > 0) {
        show("Faltan datos obligatorios para que Eva genere tu estrategia.");
        setCriticalOpen(true);
        return;
      }
      const finalBiz = prepareFinalBusiness(b, user?.id || activeBusiness?.userId || "anon");
      useStore.getState().upsertBusiness(finalBiz);
      show("Cambios guardados ✓");
      router.push("/settings");
      return;
    }

    // Gate del final: "obligatorio" obliga de verdad. Si falta CUALQUIER campo
    // required (los que el admin tiene en ON), volvemos a "Completá lo que
    // falta" — misma fuente que esa pantalla y que el wizard (business-questions
    // + overrides del admin), así nunca divergen las definiciones.
    const missReq = missingRequiredQuestions(b);
    if (missReq.length > 0) {
      setPhase("pending");
      track("onboarding_validation_failed", {
        step: -1,
        label: "required_gate",
        field: missReq[0].id,
        missingCount: missReq.length,
      });
      return;
    }

    const finalBiz = prepareFinalBusiness(b, user?.id || "anon");

    // Cierre del funnel del log de calidad: qué completó el usuario a mano
    // de lo que la IA no pudo (fire-and-forget, nunca bloquea).
    reportManualCompletionOnce(b);

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
      void completeOnboardingAndGoToStrategy(prepareFinalBusiness(b, user!.id), router);
      return;
    }

    // Modo local sin Supabase (dev/demo sin backend).
    if (!user) {
      login(`negocio_${Date.now()}@loca.app`);
      const localId = useStore.getState().user?.id;
      if (!localId) return;
      void completeOnboardingAndGoToStrategy(prepareFinalBusiness(b, localId), router);
      return;
    }

    void completeOnboardingAndGoToStrategy(finalBiz, router);
  }

  const onSummary = phase === "wizard" && step === SUMMARY_STEP;
  // Flujos 1 y 2 (web / .md): el Resumen es una pantalla FINAL cerrada. Nada
  // de stepper ni "Editar todo": tocarlos metía al usuario en los pasos 1-7
  // del wizard manual, que encima lo bloquea si le falta algún dato. La
  // edición queda en el lápiz por sección (modal). En modo edición y en el
  // flujo manual se mantiene la navegación completa.
  const assistedSummary =
    onSummary &&
    !editMode &&
    (b.businessInfoImportSource === "website" || b.businessInfoImportSource === "external_ai_md");

  return {
    router,
    toastNode,
    show,
    phase,
    setPhase,
    step,
    setStep,
    b,
    set,
    missing,
    statusOf,
    subcats,
    editMode,
    webLoading,
    onSummary,
    assistedSummary,
    criticalOpen,
    setCriticalOpen,
    editSection,
    openSection,
    saveSection,
    cancelSection,
    signupOpen,
    setSignupOpen,
    pendingBusiness,
    pickMethod,
    analyzeWeb,
    loadExternalMd,
    completeWithEva,
    goSummary,
    tryNext,
    finish,
  };
}
