"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore, useFlow } from "@/lib/store";
import { useGenerators } from "@/lib/generators";
import { exportStrategyHtml } from "@/lib/exports";
import { Badge, Button, Card, EmptyState, EvaLoading, Modal, PageHeader, useToast } from "@/components/ui";
import { ApprovalActions, FeedbackPanel, ProgressTracker, StickyApproveBar, buildFlowSteps } from "@/components/flow";
import { STRATEGY_FEEDBACK, applyStructuredFeedback } from "@/lib/feedback";
import {
  Sparkles,
  Download,
  Target,
  Users,
  Megaphone,
  MessageCircle,
  Zap,
  ListChecks,
} from "lucide-react";

export default function StrategyPage() {
  const router = useRouter();
  const params = useSearchParams();
  const business = useStore((s) => s.businesses.find((b) => b.id === s.activeBusinessId) || null);
  const strategy = useStore((s) => (business ? s.strategies[business.id] : undefined));
  const setFlow = useStore((s) => s.setFlow);
  const flow = useFlow(business?.id);
  const gen = useGenerators();
  const { show, node } = useToast();

  const [loading, setLoading] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const autoTriggered = useRef(false);

  // Auto-generar al venir del onboarding (?generate=1)
  useEffect(() => {
    if (!business || autoTriggered.current) return;
    if (params.get("generate") === "1" && !strategy) {
      autoTriggered.current = true;
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business, strategy, params]);

  // La burbuja de Eva puede pedir "modificar"
  useEffect(() => {
    const onEva = (e: Event) => {
      const action = (e as CustomEvent).detail?.action;
      if (action === "modificar") setShowFeedback(true);
    };
    window.addEventListener("eva:action", onEva);
    return () => window.removeEventListener("eva:action", onEva);
  }, []);

  if (!business) return null;

  async function generate(feedback?: string) {
    setLoading(true);
    try {
      const meta = await gen.generateStrategy(business!, feedback);
      show(meta?.warning || (feedback ? "Estrategia actualizada ✨" : "Estrategia lista ✨"));
      setShowFeedback(false);
    } catch (e: any) {
      show(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  function approve() {
    setFlow(business!.id, { strategy: "approved" });
    show("Estrategia aprobada 🎉 Eva está generando tus contenidos.");
    setTimeout(() => router.push("/content?generate=1"), 600);
  }

  function applyFeedback(values: string[], custom: string) {
    const instruction = applyStructuredFeedback(STRATEGY_FEEDBACK, values, custom);
    generate(instruction);
  }

  const approved = flow.strategy === "approved";

  return (
    <div className={strategy ? "space-y-5 pb-24" : "space-y-5"}>
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

      {loading && !strategy && <EvaLoading text="Eva está preparando tu estrategia…" />}

      {!strategy && !loading && (
        <EmptyState
          icon={Sparkles}
          title="Generá tu estrategia"
          description="Eva la arma en segundos a partir de tu negocio."
        >
          <Button onClick={() => generate()} loading={loading}>
            <Sparkles className="h-4 w-4" /> Generar estrategia
          </Button>
        </EmptyState>
      )}

      {strategy && (
        <>
          {/* Vista resumida visual */}
          <div className="grid gap-4 lg:grid-cols-2">
            <HeroCard
              icon={Sparkles}
              tone="loca"
              label="Posicionamiento"
              text={strategy.brandPositioning}
            />
            <HeroCard icon={Target} tone="lima" label="Objetivo del mes" text={strategy.monthlyGoal} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MiniCard icon={Users} label="Audiencia principal" text={strategy.audienceSummary} />
            <MiniCard icon={MessageCircle} label="Tono de voz" text={strategy.toneOfVoice} />
            <Card>
              <div className="mb-2 flex items-center gap-2 text-zinc-500">
                <Megaphone className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase">Canales</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {strategy.recommendedChannels.map((c) => (
                  <Badge key={c} tone="pink">{c}</Badge>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 text-zinc-500">
                <Zap className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase">CTA principal</span>
              </div>
              <Badge tone="lima" className="mt-1.5">{strategy.recommendedCta}</Badge>
            </Card>
          </div>

          <Card>
            <h3 className="mb-3 font-semibold">Pilares de contenido</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {strategy.contentPillars.map((p) => (
                <div key={p.name} className="rounded-xl bg-loca-50 p-3">
                  <p className="font-medium text-loca-700">{p.name}</p>
                  <p className="mt-1 text-sm text-zinc-600">{p.description}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="mb-2 flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-loca-600" />
              <h3 className="font-semibold">Próximas acciones</h3>
            </div>
            <ol className="list-inside list-decimal space-y-1 text-sm text-zinc-700">
              {strategy.nextActions.slice(0, 3).map((a, i) => (
                <li key={i}>{a}</li>
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
            onModify={() => setShowFeedback(true)}
            approveLabel="Aprobar estrategia"
            approvedLabel="Estrategia aprobada"
            modifyLabel="Modificar"
            nextLabel="Ver contenidos →"
            onNext={() => router.push("/content?generate=1")}
          />
        </StickyApproveBar>
      )}

      {/* Modificar estrategia (modal) */}
      <Modal open={showFeedback} onClose={() => setShowFeedback(false)} title="Modificar estrategia">
        <FeedbackPanel
          title="¿Qué querés cambiar?"
          options={STRATEGY_FEEDBACK}
          onApply={applyFeedback}
          onCancel={() => setShowFeedback(false)}
          loading={loading}
        />
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
            <FullList title="Canales recomendados" items={strategy.recommendedChannels} />
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
    </div>
  );
}

function HeroCard({
  icon: Icon,
  label,
  text,
  tone,
}: {
  icon: any;
  label: string;
  text: string;
  tone: "loca" | "lima";
}) {
  return (
    <Card className={tone === "loca" ? "bg-loca-50" : "bg-lima-50"}>
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${tone === "loca" ? "text-loca-600" : "text-lima-600"}`} />
        <span className="text-xs font-semibold uppercase text-zinc-500">{label}</span>
      </div>
      <p className="mt-2 text-base font-medium leading-snug text-zinc-800">{text}</p>
    </Card>
  );
}

function MiniCard({ icon: Icon, label, text }: { icon: any; label: string; text: string }) {
  return (
    <Card>
      <div className="mb-2 flex items-center gap-2 text-zinc-500">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase">{label}</span>
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
