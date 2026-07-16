"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore, useFlow } from "@/lib/store";
import { canGenerateStrategy, requiresAuthForStrategy } from "@/lib/auth/user";
import { prepareFinalBusiness } from "@/lib/onboarding/complete";
import { saveOnboardingDraft } from "@/lib/onboarding-draft";
import { OnboardingSignupModal } from "@/components/onboarding-signup-modal";
import { useGenerators } from "@/lib/generators";
import { startStrategyInBackground, isStrategyGenerating, restartStrategyGeneration } from "@/lib/strategy-job";
import { isStrategyJobStale } from "@/lib/strategy-job-utils";
import { exportStrategyHtml } from "@/lib/exports";
import { Badge, Button, Card, EmptyState, EvaLoading, Modal, PageHeader, useToast } from "@/components/ui";
import { ApprovalActions, FeedbackPanel, ProgressTracker, StickyApproveBar, buildFlowSteps } from "@/components/flow";
import {
  STRATEGY_SECTION_FEEDBACK,
  STRATEGY_SECTION_LABELS,
  applyStrategySectionFeedback,
  type StrategySectionKey,
} from "@/lib/feedback";
import { PlatformLogo } from "@/components/platform-logo";
import { PendingFlow } from "@/components/pending-flow";
import { missingCriticalLabels, pendingQuestions } from "@/lib/business-questions";
import { suggestPending } from "@/lib/eva-suggest";
import type { Business } from "@/lib/types";
import {
  Sparkles,
  Download,
  Target,
  Users,
  Megaphone,
  MessageCircle,
  Zap,
  ListChecks,
  Lock,
  Pencil,
} from "lucide-react";

export default function StrategyPage() {
  const router = useRouter();
  const params = useSearchParams();
  const business = useStore((s) => s.businesses.find((b) => b.id === s.activeBusinessId) || null);
  const user = useStore((s) => s.user);
  const strategy = useStore((s) => (business ? s.strategies[business.id] : undefined));
  const setFlow = useStore((s) => s.setFlow);
  const upsertBusiness = useStore((s) => s.upsertBusiness);
  const flow = useFlow(business?.id);
  const gen = useGenerators();
  const { show, node } = useToast();

  const [loading, setLoading] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [editSection, setEditSection] = useState<StrategySectionKey | null>(null);
  const [signupOpen, setSignupOpen] = useState(false);
  const [pendingBusiness, setPendingBusiness] = useState<Business | null>(null);
  const autoTriggered = useRef(false);
  const staleRetried = useRef(false);

  const needsSignup =
    requiresAuthForStrategy() && !canGenerateStrategy(user);

  const strategyGenerating = business ? isStrategyGenerating(business.id) : false;
  const strategyFailed = business?.strategyJob?.status === "failed";

  const criticalMissing = business ? missingCriticalLabels(business) : [];

  function openSignupGate() {
    if (!business) return;
    const draft = prepareFinalBusiness(
      { ...business, onboardingComplete: true },
      user?.id || "anon"
    );
    saveOnboardingDraft(draft);
    setPendingBusiness(draft);
    setSignupOpen(true);
  }

  async function runGenerate(feedback?: string) {
    if (!business) return;
    setLoading(true);
    try {
      const meta = await gen.generateStrategy(business, feedback);
      show(meta?.warning || (feedback ? "Estrategia actualizada ✨" : "Estrategia lista ✨"));
      setEditSection(null);
    } catch (e: any) {
      show(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  function tryGenerate(feedback?: string) {
    if (needsSignup) {
      openSignupGate();
      return;
    }
    if (feedback) {
      void runGenerate(feedback);
      return;
    }
    if (strategyFailed) {
      restartStrategyGeneration(business!.id);
      return;
    }
    startStrategyInBackground(business!.id);
  }

  // Auto-generar al llegar desde onboarding (?generate=1) o con negocio recién completado.
  useEffect(() => {
    if (!business || autoTriggered.current || strategy || criticalMissing.length > 0) return;

    const shouldAutoStart =
      params.get("generate") === "1" ||
      (canGenerateStrategy(user) && business.onboardingComplete);

    if (!shouldAutoStart) return;

    const jobStatus = business.strategyJob?.status;
    const activelyGenerating =
      jobStatus === "generating" && !isStrategyJobStale(business.strategyJob);

    // Ya hay un job en curso: solo mostrar loading.
    if (activelyGenerating) return;

    autoTriggered.current = true;
    if (needsSignup) {
      openSignupGate();
      return;
    }
    restartStrategyGeneration(business.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business, strategy, params, needsSignup, user, criticalMissing.length, business?.strategyJob?.status]);

  // Job colgado (p. ej. dev mató el background): reintentar una vez.
  useEffect(() => {
    if (!business || strategy || staleRetried.current) return;
    if (
      business.strategyJob?.status === "generating" &&
      isStrategyJobStale(business.strategyJob)
    ) {
      staleRetried.current = true;
      startStrategyInBackground(business.id);
    }
  }, [business, strategy, show]);

  if (!business) return null;

  // Guard: sin info crítica no generamos estrategia. En vez de dejar al usuario
  // perdido, lo metemos directo en el flujo de pendientes crítico (1-de-N).
  if (criticalMissing.length > 0 && !strategy) {
    return (
      <div className="space-y-5">
        {node}
        <ProgressTracker steps={buildFlowSteps(flow, true)} />
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/50 p-4">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-lg font-bold text-amber-900">
              Falta información crítica para generar una estrategia útil. Completemos esto primero.
            </p>
            <p className="text-sm text-amber-700">
              Necesitamos {criticalMissing.length} {criticalMissing.length === 1 ? "dato" : "datos"} para que Eva no genere algo genérico.
            </p>
          </div>
        </div>
        <div className="mx-auto max-w-xl">
          <PendingFlow
            business={business}
            questions={pendingQuestions(business).filter((q) => q.critical)}
            applyPatch={(patch) => upsertBusiness({ ...business!, ...patch })}
            onSuggest={() => {
              const { patch, statuses } = suggestPending(business!);
              upsertBusiness({ ...business!, ...patch, fieldStatuses: { ...business!.fieldStatuses, ...statuses } });
              show("Eva sugirió lo que pudo sin inventar. Revisalo 💗");
            }}
            onDone={() => tryGenerate()}
            doneLabel="Generar mi estrategia"
          />
        </div>
      </div>
    );
  }

  function approve() {
    if (!business) return;
    setFlow(business.id, { strategy: "approved" });
    show("Estrategia aprobada 🎉 Eva está generando tus contenidos.");
    void gen.generateMonthContents(business, 16);
    router.push("/content?generate=1");
  }

  function applySectionFeedback(section: StrategySectionKey, values: string[], custom: string) {
    const instruction = applyStrategySectionFeedback(section, values, custom);
    tryGenerate(instruction);
  }

  const approved = flow.strategy === "approved";

  return (
    <div className={strategy ? "space-y-8 pb-24" : "space-y-8"}>
      {node}
      <ProgressTracker steps={buildFlowSteps(flow, true)} />

      <PageHeader title="Tu estrategia" subtitle={`El plan de marketing de ${business.name}, listo para revisar.`}>
        {strategy && (
          <>
            <Button variant="outline" onClick={() => exportStrategyHtml(business, strategy)}>
              <Download className="h-4 w-4" /> Exportar
            </Button>
            <Button variant="outline" onClick={() => setShowFull(true)}>
              Ver completa
            </Button>
          </>
        )}
      </PageHeader>

      {(loading || strategyGenerating) && !strategy && (
        <div className="space-y-4">
          <EvaLoading text="Eva está preparando tu estrategia…" />
          {strategyGenerating && (
            <p className="text-center text-sm text-zinc-500">
              Tarda ~1 minuto. Podés navegar por el dashboard mientras tanto.
            </p>
          )}
          {strategyGenerating && (
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={() => restartStrategyGeneration(business!.id)}>
                Reintentar generación
              </Button>
            </div>
          )}
        </div>
      )}

      {!strategy && !loading && !strategyGenerating && (
        <EmptyState
          icon={Sparkles}
          title={
            needsSignup
              ? "Creá tu cuenta para continuar"
              : strategyFailed
                ? "No se pudo generar la estrategia"
                : "Generá tu estrategia"
          }
          description={
            needsSignup
              ? "Tu negocio está listo. Creá una cuenta para que Eva genere tu estrategia y guarde todo en la nube."
              : strategyFailed
                ? business.strategyJob?.error || "Hubo un error. Podés reintentar."
                : "Eva la arma en ~1 minuto a partir de tu negocio."
          }
        >
          <Button onClick={() => tryGenerate()} loading={loading || strategyGenerating}>
            <Sparkles className="h-4 w-4" />{" "}
            {needsSignup
              ? "Crear cuenta y continuar"
              : strategyFailed
                ? "Reintentar generación"
                : "Generar estrategia"}
          </Button>
        </EmptyState>
      )}

      {strategy && (
        <>
          {/* Vista resumida visual */}
          <div className="grid gap-5 lg:grid-cols-2">
            <HeroCard
              icon={Sparkles}
              tone="loca"
              label="Posicionamiento"
              text={strategy.brandPositioning}
              onEdit={() => setEditSection("brandPositioning")}
            />
            <HeroCard
              icon={Target}
              tone="lima"
              label="Objetivo del mes"
              text={strategy.monthlyGoal}
              onEdit={() => setEditSection("monthlyGoal")}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <MiniCard
              icon={Users}
              label="Audiencia principal"
              text={strategy.audienceSummary}
              onEdit={() => setEditSection("audienceSummary")}
            />
            <MiniCard
              icon={MessageCircle}
              label="Tono de voz"
              text={strategy.toneOfVoice}
              onEdit={() => setEditSection("toneOfVoice")}
            />
            <Card>
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-zinc-500">
                  <Megaphone className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Canales</span>
                </div>
                <CardEditButton label="Canales y CTA" onClick={() => setEditSection("channels")} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {strategy.recommendedChannels.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-2 rounded-full bg-loca-50 py-1 pl-1 pr-3 text-xs font-semibold text-loca-700 ring-1 ring-inset ring-loca-100"
                  >
                    <PlatformLogo channel={c} size={22} />
                    {c}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 text-zinc-500">
                <Zap className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">CTA principal</span>
              </div>
              <Badge tone="lima" className="mt-2">{strategy.recommendedCta}</Badge>
            </Card>
          </div>

          <Card>
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-lg font-bold tracking-tight text-zinc-900">Pilares de contenido</h3>
              <CardEditButton label="Pilares de contenido" onClick={() => setEditSection("contentPillars")} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {strategy.contentPillars.map((p) => (
                <div key={p.name} className="rounded-2xl bg-loca-50 p-4 ring-1 ring-inset ring-loca-100/60 transition hover:-translate-y-0.5 hover:shadow-card">
                  <p className="font-semibold text-loca-700">{p.name}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{p.description}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-loca-600" />
                <h3 className="text-lg font-bold tracking-tight text-zinc-900">Próximas acciones</h3>
              </div>
              <CardEditButton label="Próximas acciones" onClick={() => setEditSection("nextActions")} />
            </div>
            <ol className="space-y-3">
              {strategy.nextActions.slice(0, 3).map((a, i) => (
                <li key={i} className="flex items-start gap-3 text-[15px] leading-relaxed text-zinc-700">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-loca-100 text-xs font-bold text-loca-700">
                    {i + 1}
                  </span>
                  {a}
                </li>
              ))}
            </ol>
          </Card>
        </>
      )}

      {/* Barra sticky de aprobación */}
      {strategy && (
        <StickyApproveBar>
          <ApprovalActions
            approved={approved}
            onApprove={approve}
            approveLabel="Aprobar estrategia"
            approvedLabel="Estrategia aprobada"
            nextLabel="Ver contenidos →"
            onNext={() => router.push("/content?generate=1")}
          />
        </StickyApproveBar>
      )}

      {/* Modificar una sección (modal por card) */}
      <Modal
        open={!!editSection}
        onClose={() => setEditSection(null)}
        title={editSection ? `Modificar ${STRATEGY_SECTION_LABELS[editSection]}` : ""}
      >
        {editSection && (
          <FeedbackPanel
            title={`¿Qué querés cambiar en ${STRATEGY_SECTION_LABELS[editSection]}?`}
            options={STRATEGY_SECTION_FEEDBACK[editSection]}
            onApply={(values, custom) => applySectionFeedback(editSection, values, custom)}
            onCancel={() => setEditSection(null)}
            loading={loading}
          />
        )}
      </Modal>

      {/* Vista completa en modal */}
      <Modal open={showFull} onClose={() => setShowFull(false)} title="Estrategia completa">
        {strategy && (
          <div className="space-y-4">
            <FullBlock title="Resumen del negocio">{strategy.businessSummary}</FullBlock>
            <FullBlock title="Posicionamiento">{strategy.brandPositioning}</FullBlock>
            <FullBlock title="Audiencia">{strategy.audienceSummary}</FullBlock>
            <FullBlock title="Ángulo de marketing">{strategy.mainAngle}</FullBlock>
            <div>
              <h4 className="mb-1 text-sm font-semibold">Pilares</h4>
              <ul className="space-y-1 text-sm text-zinc-600">
                {strategy.contentPillars.map((p) => (
                  <li key={p.name}>
                    <strong>{p.name}:</strong> {p.description}
                  </li>
                ))}
              </ul>
            </div>
            <FullBlock title="Tono de voz">{strategy.toneOfVoice}</FullBlock>
            <div>
              <h4 className="mb-2 text-sm font-semibold">Canales recomendados</h4>
              <div className="flex flex-wrap items-center gap-2">
                {strategy.recommendedChannels.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-2 rounded-full bg-loca-50 py-1 pl-1 pr-3 text-xs font-semibold text-loca-700 ring-1 ring-inset ring-loca-100"
                  >
                    <PlatformLogo channel={c} size={22} />
                    {c}
                  </span>
                ))}
              </div>
            </div>
            <FullList title="Ideas de ofertas" items={strategy.offerIdeas} />
            <FullList title="Mensajes clave" items={strategy.keyMessages} />
            <FullList title="Do's" items={strategy.dos} />
            <FullList title="Don'ts" items={strategy.donts} />
            <div>
              <h4 className="mb-1 text-sm font-semibold">Mix de contenidos</h4>
              <div className="space-y-2">
                {strategy.contentMix.map((m) => (
                  <div key={m.type}>
                    <div className="flex justify-between text-sm">
                      <span>{m.type}</span>
                      <span className="text-zinc-400">{m.percentage}%</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-zinc-100">
                      <div className="h-2 rounded-full bg-loca-500" style={{ width: `${m.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <FullList title="Próximas acciones" items={strategy.nextActions} ordered />
          </div>
        )}
      </Modal>

      {needsSignup && pendingBusiness && (
        <OnboardingSignupModal
          open={signupOpen}
          business={pendingBusiness}
          onClose={() => setSignupOpen(false)}
          router={router}
        />
      )}
    </div>
  );
}

function CardEditButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Modificar ${label}`}
      className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-loca-50 hover:text-loca-600"
    >
      <Pencil className="h-4 w-4" />
    </button>
  );
}

function HeroCard({
  icon: Icon,
  label,
  text,
  tone,
  onEdit,
}: {
  icon: any;
  label: string;
  text: string;
  tone: "loca" | "lima";
  onEdit?: () => void;
}) {
  return (
    <Card className={tone === "loca" ? "bg-loca-50 shadow-glow" : "bg-lima-50"}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
              tone === "loca" ? "bg-white/70 text-loca-600" : "bg-white/70 text-lima-600"
            }`}
          >
            <Icon className="h-5 w-5" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
        </div>
        {onEdit && <CardEditButton label={label} onClick={onEdit} />}
      </div>
      <p className="mt-4 text-lg font-medium leading-snug text-zinc-800">{text}</p>
    </Card>
  );
}

function MiniCard({
  icon: Icon,
  label,
  text,
  onEdit,
}: {
  icon: any;
  label: string;
  text: string;
  onEdit?: () => void;
}) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-zinc-500">
          <Icon className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
        </div>
        {onEdit && <CardEditButton label={label} onClick={onEdit} />}
      </div>
      <p className="text-sm leading-relaxed text-zinc-600">{text}</p>
    </Card>
  );
}

function FullBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-1 text-sm font-semibold">{title}</h4>
      <p className="text-sm leading-relaxed text-zinc-600">{children}</p>
    </div>
  );
}

function FullList({ title, items, ordered }: { title: string; items: string[]; ordered?: boolean }) {
  const List = ordered ? "ol" : "ul";
  return (
    <div>
      <h4 className="mb-1 text-sm font-semibold">{title}</h4>
      <List className={`${ordered ? "list-decimal" : "list-disc"} list-inside space-y-0.5 text-sm text-zinc-600`}>
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </List>
    </div>
  );
}
