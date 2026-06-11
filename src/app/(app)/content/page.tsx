"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useStore, useFlow } from "@/lib/store";
import { useGenerators } from "@/lib/generators";
import { exportContentsCsv } from "@/lib/exports";
import { Badge, Button, Card, EmptyState, EvaLoading, Modal, PageHeader, useToast } from "@/components/ui";
import { ContentPreview } from "@/components/content-preview";
import { ContentReviewDeck } from "@/components/content-review";
import { ProgressTracker, StickyApproveBar, buildFlowSteps } from "@/components/flow";
import { FORMAT_LABELS, CONTENT_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { CheckCheck, Download, FileText, Library, Lock, Play, Sparkles } from "lucide-react";
import type { Business, ContentItem } from "@/lib/types";

const STATUS_TONE: Record<string, any> = {
  borrador: "default",
  generado: "blue",
  aprobado: "green",
  rechazado: "red",
  publicado_manualmente: "lima",
};

type Tab = "revision" | "biblioteca";

export default function ContentStudioPage() {
  const params = useSearchParams();
  const business = useStore((s) => s.businesses.find((b) => b.id === s.activeBusinessId) || null);
  const allContents = useStore((s) => s.contents);
  const updateContent = useStore((s) => s.updateContent);
  const setFlow = useStore((s) => s.setFlow);
  const flow = useFlow(business?.id);
  const gen = useGenerators();
  const { show, node } = useToast();

  const [tab, setTab] = useState<Tab>("revision");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [confirmAll, setConfirmAll] = useState(false);
  const autoTriggered = useRef(false);

  const contents = useMemo(
    () => (business ? allContents.filter((c) => c.businessId === business.id) : []),
    [allContents, business]
  );
  const pending = contents.filter((c) => c.status !== "aprobado");
  const calendarApproved = flow.calendar === "approved";

  async function generateAll() {
    if (!business) return;
    setLoading(true);
    try {
      const n = await gen.generateAllContent(business, (d, t) => setProgress(`Generando ${d}/${t}…`));
      setFlow(business.id, { content: "pending_review" });
      show(n > 0 ? "Contenidos listos 🎉" : "Ya están todos generados");
    } catch (e: any) {
      show(e?.message || "Error");
    } finally {
      setLoading(false);
      setProgress("");
    }
  }

  function approveAll() {
    pending.forEach((c) => updateContent(c.id, { status: "aprobado" }));
    if (business) setFlow(business.id, { content: "approved" });
    setConfirmAll(false);
    show("Todo aprobado 🎉 Listos para publicar.");
  }

  useEffect(() => {
    if (!business || autoTriggered.current) return;
    if (params.get("generate") === "1" && calendarApproved && contents.length === 0) {
      autoTriggered.current = true;
      generateAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business, calendarApproved, contents.length, params]);

  // Cuando todo queda aprobado, marcamos el paso del flujo como aprobado.
  useEffect(() => {
    if (business && contents.length > 0 && pending.length === 0 && flow.content !== "approved") {
      setFlow(business.id, { content: "approved" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business, contents.length, pending.length, flow.content]);

  if (!business) return null;

  if (!calendarApproved) {
    return (
      <div className="space-y-5">
        {node}
        <ProgressTracker steps={buildFlowSteps(flow, true)} />
        <EmptyState
          icon={Lock}
          title="Primero aprobá el calendario"
          description="Así Eva genera los contenidos en orden y con coherencia."
        >
          <Link href="/calendar">
            <Button>Ir al calendario</Button>
          </Link>
        </EmptyState>
      </div>
    );
  }

  const showStickyBar = tab === "revision" && pending.length > 0;

  return (
    <div className={cn("space-y-5", showStickyBar && "pb-24")}>
      {node}
      <ProgressTracker steps={buildFlowSteps(flow, true)} />

      <PageHeader title="Tus contenidos" subtitle={`${contents.length} piezas para ${business.name}.`}>
        {contents.length > 0 && tab === "biblioteca" && (
          <Button variant="outline" onClick={() => exportContentsCsv(business, contents)}>
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
        )}
      </PageHeader>

      {loading && contents.length === 0 && <EvaLoading text="Eva está creando tus contenidos…" />}
      {progress && <p className="text-sm font-medium text-loca-600">{progress}</p>}

      {contents.length === 0 && !loading ? (
        <EmptyState
          icon={FileText}
          title="Generá los contenidos del mes"
          description="Eva crea el texto e imagen de cada publicación de tu calendario."
        >
          <Button onClick={generateAll} loading={loading}>
            <Sparkles className="h-4 w-4" /> Generar contenidos del mes
          </Button>
        </EmptyState>
      ) : contents.length > 0 ? (
        <>
          {/* Tabs: vista cliente (revisión) vs interno (biblioteca) */}
          <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-1">
            <TabButton active={tab === "revision"} onClick={() => setTab("revision")} icon={Play}>
              Revisión
            </TabButton>
            <TabButton active={tab === "biblioteca"} onClick={() => setTab("biblioteca")} icon={Library}>
              Biblioteca interna
            </TabButton>
          </div>

          {tab === "revision" ? (
            <ContentReviewDeck business={business} contents={contents} onToast={show} />
          ) : (
            <BibliotecaGallery contents={contents} business={business} />
          )}
        </>
      ) : null}

      {/* Sticky: Aprobar todo */}
      {showStickyBar && (
        <StickyApproveBar>
          <div className="flex items-center justify-between gap-3">
            <span className="hidden text-sm text-zinc-500 sm:block">
              {pending.length} {pending.length === 1 ? "pieza pendiente" : "piezas pendientes"}
            </span>
            <Button variant="success" size="lg" className="flex-1 sm:flex-none" onClick={() => setConfirmAll(true)}>
              <CheckCheck className="h-5 w-5" /> Aprobar todo
            </Button>
          </div>
        </StickyApproveBar>
      )}

      {/* Confirmación de aprobar todo */}
      <Modal open={confirmAll} onClose={() => setConfirmAll(false)} title="Aprobar todo">
        <p className="text-sm text-zinc-600">
          ¿Querés aprobar las {pending.length} piezas pendientes? Quedan listas para publicar.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button variant="success" size="lg" className="flex-1" onClick={approveAll}>
            <CheckCheck className="h-4 w-4" /> Sí, aprobar todo
          </Button>
          <Button variant="ghost" size="lg" className="flex-1" onClick={() => setConfirmAll(false)}>
            Seguir revisando
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition",
        active ? "bg-loca-600 text-white shadow-sm" : "text-zinc-600 hover:text-zinc-900"
      )}
    >
      <Icon className="h-4 w-4" /> {children}
    </button>
  );
}

// Galería interna (equipo): más detalle + link al detalle técnico.
function BibliotecaGallery({ contents, business }: { contents: ContentItem[]; business: Business }) {
  return (
    <>
      <p className="text-sm text-zinc-500">
        Vista interna del equipo: incluye el detalle técnico de cada pieza (prompt, brief, notas).
      </p>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {contents.map((c) => (
          <Link key={c.id} href={`/content/${c.id}`}>
            <Card className="flex h-full flex-col gap-3 p-3 transition hover:-translate-y-0.5 hover:shadow-pop">
              <ContentPreview content={c} business={business} className="!shadow-none" />
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone="pink">{c.channel}</Badge>
                <Badge>{FORMAT_LABELS[c.format]}</Badge>
                <Badge tone={STATUS_TONE[c.status]}>{CONTENT_STATUS_LABELS[c.status]}</Badge>
              </div>
              <p className="line-clamp-1 text-sm font-semibold text-zinc-900">{c.title}</p>
              <p className="line-clamp-2 text-xs text-zinc-500">{c.hook}</p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
