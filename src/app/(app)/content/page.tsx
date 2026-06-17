"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore, useFlow } from "@/lib/store";
import { useGenerators } from "@/lib/generators";
import { exportContentsCsv } from "@/lib/exports";
import { Badge, Button, Card, EmptyState, EvaLoading, Modal, PageHeader, useToast } from "@/components/ui";
import { ContentPreview } from "@/components/content-preview";
import { ContentReviewDeck } from "@/components/content-review";
import { ProgressTracker, StickyApproveBar, buildFlowSteps } from "@/components/flow";
import { FORMAT_LABELS, CONTENT_STATUS_LABELS } from "@/lib/constants";
import { bucketOf, isPublished, datePassed } from "@/lib/content-status";
import { copyToClipboard, formatDate } from "@/lib/utils";
import { CheckCheck, Copy, Eye, FileText, Library, Lock, Play, Sparkles, Unlock, CheckCircle2, Send } from "lucide-react";
import type { Business, ContentItem } from "@/lib/types";

const STATUS_TONE: Record<string, any> = {
  borrador: "default",
  generado: "blue",
  aprobado: "green",
  rechazado: "red",
  publicado_manualmente: "lima",
  pending_review: "blue",
  needs_changes: "yellow",
  scheduled: "blue",
  published: "lima",
  archived: "default",
};

type Tab = "revision" | "aprobados" | "publicados" | "biblioteca";

export default function ContentStudioPage() {
  const params = useSearchParams();
  const business = useStore((s) => s.businesses.find((b) => b.id === s.activeBusinessId) || null);
  const allContents = useStore((s) => s.contents);
  const calendars = useStore((s) => s.calendars);
  const updateContent = useStore((s) => s.updateContent);
  const setFlow = useStore((s) => s.setFlow);
  const flow = useFlow(business?.id);
  const gen = useGenerators();
  const router = useRouter();
  const { show, node } = useToast();

  const [tab, setTab] = useState<Tab>("revision");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [confirmAll, setConfirmAll] = useState(false);
  const [reopenId, setReopenId] = useState<string | null>(null);
  const autoTriggered = useRef(false);

  const contents = useMemo(
    () => (business ? allContents.filter((c) => c.businessId === business.id) : []),
    [allContents, business]
  );

  const dateById = useMemo(() => {
    const m = new Map<string, string>();
    if (business) (calendars[business.id] || []).forEach((it) => m.set(it.id, it.date));
    return m;
  }, [calendars, business]);
  const dateOf = (c: ContentItem) =>
    c.scheduledDate || (c.calendarItemId ? dateById.get(c.calendarItemId) : undefined) || c.createdAt.slice(0, 10);

  const buckets = useMemo(() => {
    const r: Record<Tab, ContentItem[]> = { revision: [], aprobados: [], publicados: [], biblioteca: contents };
    for (const c of contents) {
      const b = bucketOf(c, dateOf(c));
      r[b].push(c);
    }
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contents, dateById]);

  const pending = buckets.revision;
  const strategyApproved = flow.strategy === "approved";

  async function generateAll() {
    if (!business) return;
    setLoading(true);
    try {
      const n = await gen.generateMonthContents(business, 16, (d, t) => setProgress(`Generando ${d}/${t}…`));
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
    setTab("aprobados");
  }

  function reopen() {
    if (reopenId) {
      updateContent(reopenId, { status: "needs_changes" });
      const id = reopenId;
      setReopenId(null);
      // Llevar directo al modo edición de esa pieza.
      router.push(`/content/${id}`);
      return;
    }
    setReopenId(null);
  }

  useEffect(() => {
    if (!business || autoTriggered.current) return;
    if (params.get("generate") === "1" && strategyApproved && contents.length === 0) {
      autoTriggered.current = true;
      generateAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business, strategyApproved, contents.length, params]);

  useEffect(() => {
    if (business && contents.length > 0 && pending.length === 0 && flow.content !== "approved") {
      setFlow(business.id, { content: "approved" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business, contents.length, pending.length, flow.content]);

  if (!business) return null;

  if (!strategyApproved) {
    return (
      <div className="space-y-5">
        {node}
        <ProgressTracker steps={buildFlowSteps(flow, true)} />
        <EmptyState icon={Lock} title="Primero aprobá la estrategia" description="Cuando aprobés la estrategia, Eva genera todos los contenidos del mes.">
          <Link href="/strategy">
            <Button>Ir a la estrategia</Button>
          </Link>
        </EmptyState>
      </div>
    );
  }

  const showStickyBar = tab === "revision" && pending.length > 0;

  return (
    <div className={showStickyBar ? "space-y-5 pb-24" : "space-y-5"}>
      {node}
      <ProgressTracker steps={buildFlowSteps(flow, true)} />

      <PageHeader title="Tus contenidos" subtitle={`${contents.length} piezas para ${business.name}.`}>
        {contents.length > 0 && tab === "biblioteca" && (
          <Button variant="outline" onClick={() => exportContentsCsv(business, contents)}>
            <FileText className="h-4 w-4" /> Exportar CSV
          </Button>
        )}
      </PageHeader>

      {loading && contents.length === 0 && <EvaLoading text="Eva está creando tus contenidos…" />}
      {progress && <p className="text-sm font-medium text-loca-600">{progress}</p>}

      {contents.length === 0 && !loading ? (
        <EmptyState icon={FileText} title="Generá los contenidos del mes" description="Eva crea el texto e imagen de cada publicación de tu calendario.">
          <Button onClick={generateAll} loading={loading}>
            <Sparkles className="h-4 w-4" /> Generar contenidos del mes
          </Button>
        </EmptyState>
      ) : contents.length > 0 ? (
        <>
          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto rounded-xl border border-zinc-200 bg-white p-1">
            <TabButton active={tab === "revision"} onClick={() => setTab("revision")} icon={Play} count={buckets.revision.length}>
              Revisión
            </TabButton>
            <TabButton active={tab === "aprobados"} onClick={() => setTab("aprobados")} icon={CheckCircle2} count={buckets.aprobados.length}>
              Aprobados
            </TabButton>
            <TabButton active={tab === "publicados"} onClick={() => setTab("publicados")} icon={Send} count={buckets.publicados.length}>
              Publicados
            </TabButton>
            <TabButton active={tab === "biblioteca"} onClick={() => setTab("biblioteca")} icon={Library}>
              Biblioteca
            </TabButton>
          </div>

          {tab === "revision" && <ContentReviewDeck business={business} contents={contents} onToast={show} />}

          {tab === "aprobados" && (
            <Gallery
              items={buckets.aprobados}
              business={business}
              empty="Todavía no aprobaste ninguna pieza."
              renderActions={(c) => <ApprovedActions c={c} onToast={show} onReopen={() => setReopenId(c.id)} />}
            />
          )}

          {tab === "publicados" && (
            <Gallery
              items={buckets.publicados}
              business={business}
              empty="Todavía no hay contenidos publicados o con fecha pasada."
              badge={(c) => (datePassed(dateOf(c)) ? "Fecha pasada" : "Publicado")}
              renderActions={(c) => <PublishedActions c={c} onToast={show} />}
            />
          )}

          {tab === "biblioteca" && <BibliotecaGallery contents={contents} business={business} dateOf={dateOf} />}
        </>
      ) : null}

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

      {/* Confirmación reabrir edición */}
      <Modal open={!!reopenId} onClose={() => setReopenId(null)} title="Reabrir edición">
        <p className="text-sm text-zinc-600">
          Este contenido ya fue aprobado. Si lo editás, volverá a estado pendiente de revisión. ¿Querés continuar?
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button variant="primary" size="lg" className="flex-1" onClick={reopen}>
            <Unlock className="h-4 w-4" /> Sí, reabrir edición
          </Button>
          <Button variant="ghost" size="lg" className="flex-1" onClick={() => setReopenId(null)}>
            Cancelar
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
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
        active ? "bg-loca-600 text-white shadow-sm" : "text-zinc-600 hover:text-zinc-900"
      }`}
    >
      <Icon className="h-4 w-4" /> {children}
      {count != null && count > 0 && (
        <span className={`rounded-full px-1.5 text-[11px] ${active ? "bg-white/20" : "bg-zinc-100 text-zinc-500"}`}>{count}</span>
      )}
    </button>
  );
}

// Galería reutilizable (aprobados / publicados)
function Gallery({
  items,
  business,
  empty,
  badge,
  renderActions,
}: {
  items: ContentItem[];
  business: Business;
  empty: string;
  badge?: (c: ContentItem) => string;
  renderActions: (c: ContentItem) => React.ReactNode;
}) {
  if (items.length === 0) {
    return <Card className="px-6 py-10 text-center text-sm text-zinc-500">{empty}</Card>;
  }
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((c) => (
        <Card key={c.id} className="flex h-full flex-col gap-3 p-3">
          <Link href={`/content/${c.id}`}>
            <ContentPreview content={c} business={business} className="!shadow-none" />
          </Link>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="pink">{c.channel}</Badge>
            <Badge>{FORMAT_LABELS[c.format]}</Badge>
            {badge ? <Badge tone="lima">{badge(c)}</Badge> : <Badge tone="green">Aprobado</Badge>}
          </div>
          <p className="line-clamp-1 text-sm font-semibold text-zinc-900">{c.title}</p>
          <p className="line-clamp-2 text-xs text-zinc-500">{c.caption || c.hook}</p>
          <div className="mt-auto">{renderActions(c)}</div>
        </Card>
      ))}
    </div>
  );
}

function ApprovedActions({ c, onToast, onReopen }: { c: ContentItem; onToast: (m: string) => void; onReopen: () => void }) {
  const router = useRouter();
  return (
    <div className="grid grid-cols-2 gap-1.5">
      <Button size="sm" variant="outline" onClick={() => router.push(`/content/${c.id}`)}>
        <Eye className="h-3.5 w-3.5" /> Ver
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={async () => {
          const ok = await copyToClipboard(`${c.caption}\n\n${c.hashtags.join(" ")}`);
          onToast(ok ? "Caption copiado" : "No se pudo copiar");
        }}
      >
        <Copy className="h-3.5 w-3.5" /> Copiar
      </Button>
      <Button size="sm" variant="ghost" className="col-span-2" onClick={onReopen}>
        <Unlock className="h-3.5 w-3.5" /> Reabrir edición
      </Button>
    </div>
  );
}

function PublishedActions({ c, onToast }: { c: ContentItem; onToast: (m: string) => void }) {
  const router = useRouter();
  return (
    <div className="grid grid-cols-2 gap-1.5">
      <Button size="sm" variant="outline" onClick={() => router.push(`/content/${c.id}`)}>
        <Eye className="h-3.5 w-3.5" /> Ver
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={async () => {
          const ok = await copyToClipboard(`${c.caption}\n\n${c.hashtags.join(" ")}`);
          onToast(ok ? "Caption copiado" : "No se pudo copiar");
        }}
      >
        <Copy className="h-3.5 w-3.5" /> Copiar
      </Button>
    </div>
  );
}

// Biblioteca interna (equipo): detalle técnico, con protección si está aprobado/publicado.
function BibliotecaGallery({
  contents,
  business,
  dateOf,
}: {
  contents: ContentItem[];
  business: Business;
  dateOf: (c: ContentItem) => string;
}) {
  return (
    <>
      <p className="text-sm text-zinc-500">
        Vista interna: incluye prompts, briefs y metadata. Esta información no debería verla el cliente final.
      </p>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {contents.map((c) => {
          const locked = bucketOf(c, dateOf(c)) !== "revision";
          return (
            <Link key={c.id} href={`/content/${c.id}`}>
              <Card className="flex h-full flex-col gap-3 p-3 transition hover:-translate-y-0.5 hover:shadow-pop">
                <ContentPreview content={c} business={business} className="!shadow-none" />
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone="pink">{c.channel}</Badge>
                  <Badge>{FORMAT_LABELS[c.format]}</Badge>
                  <Badge tone={STATUS_TONE[c.status]}>{CONTENT_STATUS_LABELS[c.status]}</Badge>
                  {locked && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
                      <Lock className="h-3 w-3" /> protegido
                    </span>
                  )}
                </div>
                <p className="line-clamp-1 text-sm font-semibold text-zinc-900">{c.title}</p>
                <p className="line-clamp-2 text-xs text-zinc-500">{c.hook}</p>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}
