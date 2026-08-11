"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore, useFlow } from "@/lib/store";
import { useGenerators, useMonthContentGenerating } from "@/lib/generators";
import { api } from "@/lib/api";
import { exportContentsCsv } from "@/lib/exports";
import { exportContentPack } from "@/lib/content-pack";
import { Badge, Button, Card, EmptyState, EvaLoading, Modal, useToast } from "@/components/ui";
import { ContentPreview } from "@/components/content-preview";
import { PlatformLogos, contentPlatforms } from "@/components/platform-logo";
import { ContentReviewDeck } from "@/components/content-review";
import { GenerationProgress } from "@/components/generation-progress";
import { ProgressTracker, StickyApproveBar, buildFlowSteps } from "@/components/flow";
import { FORMAT_LABELS, CONTENT_STATUS_LABELS } from "@/lib/constants";
import { bucketOf, hasPublishError } from "@/lib/content-status";
import { copyToClipboard, formatDate } from "@/lib/utils";
import { track } from "@/lib/analytics";
import { CheckCheck, Copy, Eye, FileText, Library, Lock, Play, Sparkles, Unlock, CheckCircle2, Send, AlertTriangle, ExternalLink, Download } from "lucide-react";
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
  const [prog, setProg] = useState<{ done: number; total: number; phase: string } | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [reopenId, setReopenId] = useState<string | null>(null);
  // Export "pack de contenidos" (.zip)
  const [exporting, setExporting] = useState(false);
  const [exportRangeOpen, setExportRangeOpen] = useState(false);
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
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
  const contentGenerating = useMonthContentGenerating(business?.id);

  async function generateAll() {
    if (!business) return;
    setLoading(true);
    try {
      const n = await gen.generateMonthContents(business, 16, (d, t, phase) => {
        setProg({ done: d, total: t, phase: phase || "default" });
        setProgress(
          phase === "imagen"
            ? `Textos listos ✓ — generando imágenes ${d}/${t}… (van apareciendo en las piezas)`
            : `Generando contenido ${d}/${t}…`
        );
      });
      show(n > 0 ? "Contenidos listos 🎉" : "Ya están todos generados");
    } catch (e: any) {
      show(e?.message || "Error");
    } finally {
      setLoading(false);
      setProgress("");
      setProg(null);
    }
  }

  function approveAll() {
    pending.forEach((c) => updateContent(c.id, { status: "aprobado" }));
    if (business) setFlow(business.id, { content: "approved" });
    setConfirmAll(false);
    // ¿Revisan de verdad o aprueban en bloque? Comparar con content_approved.
    track(
      "content_approved_all",
      { count: pending.length },
      { businessId: business?.id }
    );
    show("Todo aprobado 🎉 Listos para publicar.");
    setTab("aprobados");
  }

  // Publicar una pieza en Meta (manual o reintento). Ver PLAN-v2 item 11 / A.
  async function publishOne(c: ContentItem) {
    if (!business) return;
    track("content_publish_clicked", { contentId: c.id, retry: hasPublishError(c) });
    show("Publicando…");
    try {
      const res = await api.publishMeta(business.id, c.id);
      updateContent(c.id, {
        status: "published",
        publishedAt: new Date().toISOString(),
        publishAttemptedAt: new Date().toISOString(),
        publishedUrl: res.permalink,
        publishedMediaId: res.mediaId,
        publishedPlatform: res.platform === "facebook" ? "Facebook" : "Instagram",
        publishError: undefined,
      });
      show(res.permalink ? "Publicado 🎉" : "Publicado 🎉 (sin link disponible)");
      setTab("publicados");
    } catch (e: any) {
      updateContent(c.id, {
        publishError: e?.message || "No se pudo publicar",
        publishAttemptedAt: new Date().toISOString(),
      });
      show(e?.message || "No se pudo publicar");
    }
  }

  // Export "pack de contenidos" (.zip): imagen + copy .txt + _resumen.csv.
  async function runExport(list: ContentItem[]) {
    if (!business) return;
    if (list.length === 0) {
      show("No hay piezas para exportar en ese rango.");
      return;
    }
    setExporting(true);
    show("Preparando el pack… 📦");
    try {
      const items = list.map((c) => ({ content: c, date: dateOf(c) }));
      const n = await exportContentPack(business, items);
      // Proxy de publicación manual fuera de LOCA.
      track("content_exported", { type: "pack", count: n }, { businessId: business.id });
      show(`Pack listo: ${n} ${n === 1 ? "pieza" : "piezas"} 📦`);
    } catch (e: any) {
      show(e?.message || "No se pudo generar el pack");
    } finally {
      setExporting(false);
    }
  }

  function exportPublishedRange() {
    const from = rangeFrom;
    const to = rangeTo;
    const list = buckets.publicados.filter((c) => {
      const d = dateOf(c).slice(0, 10);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
    setExportRangeOpen(false);
    void runExport(list);
  }

  function reopen() {
    if (reopenId) {
      updateContent(reopenId, { status: "needs_changes" });
      track("content_reopened", { contentId: reopenId }, { businessId: business?.id });
      const id = reopenId;
      setReopenId(null);
      // Llevar directo al modo edición de esa pieza.
      router.push(`/content/${id}`);
      return;
    }
    setReopenId(null);
  }

  useEffect(() => {
    if (!business || autoTriggered.current || !strategyApproved) return;
    if (params.get("generate") !== "1") return;
    autoTriggered.current = true;
    // Si el batch ya arrancó desde "Aprobar estrategia", no lo duplicamos:
    // el hook contentGenerating ya muestra el progreso.
    if (contentGenerating) return;
    void generateAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business, strategyApproved, params, contentGenerating]);

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
    <div className={showStickyBar ? "space-y-3 pb-24" : "space-y-3"}>
      {node}

      {/* Popup sutil de progreso, siempre visible mientras Eva genera (item 22) */}
      {(loading || contentGenerating) && (
        <GenerationProgress
          done={prog?.done}
          total={prog?.total}
          phase={prog?.phase}
          onEmailClick={() => show("Aviso por email: disponible próximamente ✉️")}
        />
      )}

      {(loading || contentGenerating) && contents.length === 0 && (
        <EvaLoading text="Eva está creando tus contenidos…" />
      )}

      {contents.length === 0 && !loading && !contentGenerating ? (
        <EmptyState icon={FileText} title="Generá los contenidos del mes" description="Eva crea el texto e imagen de cada publicación de tu calendario.">
          <Button onClick={generateAll} loading={loading}>
            <Sparkles className="h-4 w-4" /> Generar contenidos del mes
          </Button>
        </EmptyState>
      ) : contents.length > 0 ? (
        <>
          {/* Barra compacta: título + tabs + "Aprobar todo" siempre visible (item 9) */}
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="mr-1 text-lg font-bold tracking-tight text-foreground">Tus contenidos</h1>
            <div className="flex gap-1 overflow-x-auto rounded-xl border border-border/70 bg-card p-1 shadow-soft">
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
            <div className="ml-auto flex items-center gap-2">
              {pending.length > 0 && (
                <Button variant="success" size="sm" onClick={() => setConfirmAll(true)}>
                  <CheckCheck className="h-4 w-4" /> Aprobar todo ({pending.length})
                </Button>
              )}
              {/* Export pack: Aprobados (todo) / Publicados (con rango) — items export */}
              {tab === "aprobados" && buckets.aprobados.length > 0 && (
                <Button variant="outline" size="sm" disabled={exporting} onClick={() => runExport(buckets.aprobados)}>
                  <Download className="h-4 w-4" /> {exporting ? "Preparando…" : "Exportar"}
                </Button>
              )}
              {tab === "publicados" && buckets.publicados.length > 0 && (
                <Button variant="outline" size="sm" disabled={exporting} onClick={() => { setRangeFrom(""); setRangeTo(""); setExportRangeOpen(true); }}>
                  <Download className="h-4 w-4" /> {exporting ? "Preparando…" : "Exportar"}
                </Button>
              )}
              {tab === "biblioteca" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    track(
                      "content_exported",
                      { type: "csv", count: contents.length },
                      { businessId: business.id }
                    );
                    exportContentsCsv(business, contents);
                  }}
                >
                  <FileText className="h-4 w-4" /> Exportar CSV
                </Button>
              )}
            </div>
          </div>

          {tab === "revision" && <ContentReviewDeck business={business} contents={contents} onToast={show} />}

          {tab === "aprobados" && (
            <Gallery
              items={buckets.aprobados}
              business={business}
              empty="Todavía no aprobaste ninguna pieza."
              renderActions={(c) => (
                <ApprovedActions
                  c={c}
                  onToast={show}
                  onReopen={() => setReopenId(c.id)}
                  onPublish={() => publishOne(c)}
                />
              )}
            />
          )}

          {tab === "publicados" && (
            <Gallery
              items={buckets.publicados}
              business={business}
              empty="Todavía no hay contenidos publicados. Cuando publiques en tus redes, van a aparecer acá."
              badge={() => "Publicado"}
              renderActions={(c) => <PublishedActions c={c} onToast={show} />}
            />
          )}

          {tab === "biblioteca" && <BibliotecaGallery contents={contents} business={business} dateOf={dateOf} />}
        </>
      ) : null}

      {showStickyBar && (
        <StickyApproveBar>
          <div className="flex items-center justify-between gap-3">
            <span className="hidden text-sm text-muted-foreground sm:block">
              {pending.length} {pending.length === 1 ? "pieza pendiente" : "piezas pendientes"}
            </span>
            <Button variant="success" size="lg" className="flex-1 sm:flex-none" onClick={() => setConfirmAll(true)}>
              <CheckCheck className="h-5 w-5" /> Aprobar todo
            </Button>
          </div>
        </StickyApproveBar>
      )}

      <Modal open={confirmAll} onClose={() => setConfirmAll(false)} title="Aprobar todo">
        <p className="text-sm text-muted-foreground-2">
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
        <p className="text-sm text-muted-foreground-2">
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

      {/* Exportar publicados por rango de fechas (pack .zip) */}
      <Modal open={exportRangeOpen} onClose={() => setExportRangeOpen(false)} title="Exportar publicados">
        <p className="text-sm text-muted-foreground-2">
          Elegí un rango de fechas (opcional). Si lo dejás vacío, se exportan todos los publicados.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="loca-label">Desde</label>
            <input type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} className="loca-input" />
          </div>
          <div>
            <label className="loca-label">Hasta</label>
            <input type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} className="loca-input" />
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button variant="primary" size="lg" className="flex-1" onClick={exportPublishedRange}>
            <Download className="h-4 w-4" /> Exportar pack
          </Button>
          <Button variant="ghost" size="lg" className="flex-1" onClick={() => setExportRangeOpen(false)}>
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
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
        active ? "bg-loca-600 text-white shadow-lift" : "text-muted-foreground hover:bg-surface-muted/70 hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" /> {children}
      {count != null && count > 0 && (
        <span className={`rounded-full px-1.5 text-[11px] ${active ? "bg-card/20" : "bg-surface-muted text-muted-foreground"}`}>{count}</span>
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
    return <Card className="px-6 py-10 text-center text-sm text-muted-foreground">{empty}</Card>;
  }
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((c) => (
        <Card key={c.id} className="flex h-full flex-col gap-3 p-3 transition hover:shadow-pop">
          <Link href={`/content/${c.id}`} className="relative block">
            <ContentPreview content={c} business={business} className="!shadow-none" />
            <PlatformLogos
              channels={contentPlatforms(c.channel, c.distributionPlatforms, business.marketingChannels)}
              size={28}
              className="absolute right-2.5 top-2.5 drop-shadow-lg"
            />
          </Link>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge>{FORMAT_LABELS[c.format]}</Badge>
            {badge ? <Badge tone="lima">{badge(c)}</Badge> : <Badge tone="green">Aprobado</Badge>}
          </div>
          <p className="overflow-wrap-anywhere line-clamp-1 text-[15px] font-bold text-foreground">{c.title}</p>
          <p className="overflow-wrap-anywhere line-clamp-2 text-xs text-muted-foreground">{c.caption || c.hook}</p>
          <div className="mt-auto">{renderActions(c)}</div>
        </Card>
      ))}
    </div>
  );
}

function ApprovedActions({
  c,
  onToast,
  onReopen,
  onPublish,
}: {
  c: ContentItem;
  onToast: (m: string) => void;
  onReopen: () => void;
  onPublish: () => void;
}) {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);
  const failed = hasPublishError(c);
  const doPublish = async () => {
    setPublishing(true);
    try {
      await onPublish();
    } finally {
      setPublishing(false);
    }
  };
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {/* Alerta si la última publicación falló (item 11) */}
      {failed && (
        <div className="col-span-2 flex items-start gap-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-2.5 text-xs text-amber-800 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
          <span>No se pudo publicar: {c.publishError}</span>
        </div>
      )}
      <Button
        size="sm"
        variant={failed ? "outline" : "primary"}
        className="col-span-2"
        onClick={doPublish}
        disabled={publishing}
      >
        <Send className="h-3.5 w-3.5" /> {publishing ? "Publicando…" : failed ? "Reintentar publicación" : "Publicar ahora"}
      </Button>
      <Button size="sm" variant="outline" onClick={() => router.push(`/content/${c.id}`)}>
        <Eye className="h-3.5 w-3.5" /> Ver
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={async () => {
          const ok = await copyToClipboard(c.caption);
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
      {/* Ver contenido → link real del post publicado (item A7) */}
      {c.publishedUrl ? (
        <a
          href={c.publishedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-xl bg-loca-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-loca-700"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Ver publicación
        </a>
      ) : null}
      <Button size="sm" variant="outline" onClick={() => router.push(`/content/${c.id}`)}>
        <Eye className="h-3.5 w-3.5" /> Ver
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={async () => {
          const ok = await copyToClipboard(c.caption);
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
      <p className="text-sm text-muted-foreground">
        Vista interna: incluye prompts, briefs y metadata. Esta información no debería verla el cliente final.
      </p>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {contents.map((c) => {
          const locked = bucketOf(c, dateOf(c)) !== "revision";
          return (
            <Link key={c.id} href={`/content/${c.id}`}>
              <Card className="flex h-full flex-col gap-3 p-3 transition hover:-translate-y-0.5 hover:shadow-pop">
                <div className="relative">
                  <ContentPreview content={c} business={business} className="!shadow-none" />
                  <PlatformLogos
                    channels={contentPlatforms(c.channel, c.distributionPlatforms, business.marketingChannels)}
                    size={28}
                    className="absolute right-2.5 top-2.5 drop-shadow-lg"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge>{FORMAT_LABELS[c.format]}</Badge>
                  <Badge tone={STATUS_TONE[c.status]}>{CONTENT_STATUS_LABELS[c.status]}</Badge>
                  {locked && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-faint">
                      <Lock className="h-3 w-3" /> protegido
                    </span>
                  )}
                </div>
                <p className="overflow-wrap-anywhere line-clamp-1 text-sm font-semibold text-foreground">{c.title}</p>
                <p className="overflow-wrap-anywhere line-clamp-2 text-xs text-muted-foreground">{c.hook}</p>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}
