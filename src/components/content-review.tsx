"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useGenerators } from "@/lib/generators";
import { Badge, Button, Card, Field, Input, Modal, Textarea } from "@/components/ui";
import { ContentPreview } from "@/components/content-preview";
import { FORMAT_LABELS } from "@/lib/constants";
import { bucketOf } from "@/lib/content-status";
import { formatDate, nowIso } from "@/lib/utils";
import type { Business, ContentItem } from "@/lib/types";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  PartyPopper,
  ImageIcon,
  PencilLine,
} from "lucide-react";

function typeTag(format: string): string {
  if (format === "reel") return "Reel";
  if (format === "story") return "Story";
  if (format === "carrusel") return "Carrusel";
  if (format === "ad") return "Anuncio";
  if (format === "email") return "Email";
  return "Feed";
}

function contentDate(c: ContentItem, calendars: Record<string, any[]>): string {
  if (c.scheduledDate) return c.scheduledDate;
  const items = calendars[c.businessId] || [];
  return items.find((it) => it.id === c.calendarItemId)?.date || c.createdAt.slice(0, 10);
}

// ── Editar copy y fecha (manual, SIN IA) ─────────────────────
export function ContentManualEditModal({
  content,
  open,
  onClose,
  onToast,
}: {
  content: ContentItem;
  open: boolean;
  onClose: () => void;
  onToast: (m: string) => void;
}) {
  const updateContent = useStore((s) => s.updateContent);
  const [caption, setCaption] = React.useState(content.caption);
  const [date, setDate] = React.useState(content.scheduledDate || "");
  const [time, setTime] = React.useState(content.scheduledTime || "");

  React.useEffect(() => {
    if (open) {
      setCaption(content.caption);
      setDate(content.scheduledDate || "");
      setTime(content.scheduledTime || "");
    }
  }, [open, content.id]);

  function save() {
    const edited: string[] = [];
    if (caption !== content.caption) edited.push("caption");
    if (date !== (content.scheduledDate || "")) edited.push("scheduledDate");
    if (time !== (content.scheduledTime || "")) edited.push("scheduledTime");
    updateContent(content.id, {
      caption,
      scheduledDate: date || undefined,
      scheduledTime: time || undefined,
      lastManualEditAt: nowIso(),
      manuallyEditedFields: Array.from(new Set([...(content.manuallyEditedFields || []), ...edited])),
    });
    onToast("Cambios guardados (sin usar IA) ✏️");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Editar copy y fecha">
      <div className="space-y-3">
        <p className="text-sm text-zinc-500">Editás vos, sin usar IA ni gastar créditos. La pieza sigue aprobada.</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha de publicación">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Horario">
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>
        <Field label="Copy / caption">
          <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} className="min-h-[140px]" />
        </Field>
        <Button variant="success" size="lg" className="w-full" onClick={save}>
          <Check className="h-4 w-4" /> Guardar cambios
        </Button>
      </div>
    </Modal>
  );
}

// ── Cambiar imagen/video o concepto visual (puede usar IA) ───
export function ContentVisualEditModal({
  business,
  content,
  open,
  onClose,
  onToast,
}: {
  business: Business;
  content: ContentItem;
  open: boolean;
  onClose: () => void;
  onToast: (m: string) => void;
}) {
  const gen = useGenerators();
  const updateContent = useStore((s) => s.updateContent);
  const [prompt, setPrompt] = React.useState(content.imagePrompt);
  const [concept, setConcept] = React.useState(content.visualConcept);
  const [imgLoading, setImgLoading] = React.useState(false);
  const [regenerated, setRegenerated] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setPrompt(content.imagePrompt);
      setConcept(content.visualConcept);
      setRegenerated(false);
    }
  }, [open, content.id]);

  async function regenerate() {
    setImgLoading(true);
    try {
      // Aplicar el prompt editado antes de generar
      updateContent(content.id, { imagePrompt: prompt });
      const res = await gen.generateImage({ ...content, imagePrompt: prompt }, business);
      setRegenerated(true);
      onToast(res.provider === "mock" ? "Imagen simulada (modo demo)" : "Imagen generada ✨");
    } catch (e: any) {
      onToast(e?.message || "No se pudo generar la imagen");
    } finally {
      setImgLoading(false);
    }
  }

  function save() {
    const changed = prompt !== content.imagePrompt || concept !== content.visualConcept || regenerated;
    updateContent(content.id, {
      imagePrompt: prompt,
      visualConcept: concept,
      // Cambiar el visual hace que vuelva a revisión si estaba aprobado.
      ...(changed && content.status === "aprobado" ? { status: "needs_changes" as const } : {}),
    });
    if (changed && content.status === "aprobado") onToast("Cambiaste el visual: la pieza volvió a revisión.");
    else onToast("Cambios guardados ✨");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Cambiar imagen/video">
      <div className="space-y-3">
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          ⚡ Regenerar la imagen puede usar IA (y créditos). Si cambiás el visual, la pieza vuelve a revisión.
        </div>
        <ContentPreview content={content} business={business} className="!shadow-none" />
        <Field label="Concepto visual">
          <Textarea value={concept} onChange={(e) => setConcept(e.target.value)} className="min-h-[70px] text-sm" />
        </Field>
        <Field label="Prompt de imagen (interno)">
          <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="min-h-[80px] text-xs" />
        </Field>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="flex-1" onClick={regenerate} loading={imgLoading}>
            {!imgLoading && <ImageIcon className="h-4 w-4" />} Regenerar imagen (IA)
          </Button>
          <Button variant="primary" className="flex-1" onClick={save}>
            <Check className="h-4 w-4" /> Guardar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Deck de revisión ─────────────────────────────────────────
export function ContentReviewDeck({
  business,
  contents,
  onToast,
}: {
  business: Business;
  contents: ContentItem[];
  onToast: (m: string) => void;
}) {
  const router = useRouter();
  const updateContent = useStore((s) => s.updateContent);
  const calendars = useStore((s) => s.calendars);

  const [index, setIndex] = React.useState(0);
  const [manualOpen, setManualOpen] = React.useState(false);
  const [visualOpen, setVisualOpen] = React.useState(false);

  const dateOf = React.useCallback((c: ContentItem) => contentDate(c, calendars), [calendars]);
  const isPending = React.useCallback((c: ContentItem) => bucketOf(c, dateOf(c)) === "revision", [dateOf]);

  const ordered = React.useMemo(
    () => [...contents].sort((a, b) => dateOf(a).localeCompare(dateOf(b))),
    [contents, dateOf]
  );
  const pendingCount = ordered.filter(isPending).length;

  React.useEffect(() => {
    if (index > ordered.length - 1) setIndex(Math.max(0, ordered.length - 1));
  }, [ordered.length, index]);

  if (pendingCount === 0 && ordered.length > 0) {
    return (
      <Card className="flex flex-col items-center px-6 py-14 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <PartyPopper className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-zinc-900">Todo aprobado 🎉</h2>
        <p className="mt-1 max-w-sm text-sm text-zinc-500">Tus contenidos están listos para publicar.</p>
        <Button className="mt-5" onClick={() => router.push("/calendar")}>
          <CalendarClock className="h-4 w-4" /> Ver calendario de contenidos aprobados
        </Button>
      </Card>
    );
  }

  const current = ordered[index];
  if (!current) return null;

  function goNextPending(fromIdx: number) {
    for (let i = fromIdx + 1; i < ordered.length; i++) if (isPending(ordered[i])) return setIndex(i);
    for (let i = 0; i < ordered.length; i++) if (isPending(ordered[i])) return setIndex(i);
  }

  function approve() {
    updateContent(current.id, { status: "aprobado" });
    onToast("Aprobado. Vamos con la siguiente.");
    goNextPending(index);
  }

  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-zinc-50 px-4 py-2.5 text-sm text-zinc-500">
        Revisá y aprobá cada contenido. Cuando aprobás una pieza, desaparece de esta cola y pasa al calendario.
      </p>

      {/* Barra de progreso + navegación */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-500">Pieza {index + 1} de {ordered.length}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">{pendingCount} sin aprobar</span>
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="rounded-full border border-zinc-200 bg-white p-1.5 text-zinc-500 transition hover:bg-zinc-50 disabled:opacity-40"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIndex((i) => Math.min(ordered.length - 1, i + 1))}
            disabled={index === ordered.length - 1}
            className="rounded-full border border-zinc-200 bg-white p-1.5 text-zinc-500 transition hover:bg-zinc-50 disabled:opacity-40"
            aria-label="Siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Plataforma · formato (una sola vez) */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone="pink">{current.channel}</Badge>
        <Badge>{typeTag(current.format)}</Badge>
        {current.status === "needs_changes" && <Badge tone="yellow">Con cambios</Badge>}
      </div>

      {/* Desktop: visual izquierda, copy/datos derecha */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <div className="mx-auto max-w-[440px] lg:mx-0">
            <ContentPreview content={current} business={business} />
            <p className="mt-3 text-center text-sm text-zinc-500 lg:text-left">
              Fecha y horario de publicación: <span className="font-medium text-zinc-700">{formatDate(dateOf(current))}{current.scheduledTime ? ` · ${current.scheduledTime}` : ""}</span>
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{current.caption}</p>
            {current.hashtags.length > 0 && <p className="mt-2 text-sm text-loca-600">{current.hashtags.join(" ")}</p>}
          </Card>

          <div className="space-y-2">
            <Button variant="success" size="lg" className="w-full" onClick={approve}>
              <Check className="h-5 w-5" /> Aprobar
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="flex-1" onClick={() => setManualOpen(true)}>
                <PencilLine className="h-4 w-4" /> Editar copy y fecha
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setVisualOpen(true)}>
                <ImageIcon className="h-4 w-4" /> Cambiar imagen/video
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ContentManualEditModal content={current} open={manualOpen} onClose={() => setManualOpen(false)} onToast={onToast} />
      <ContentVisualEditModal business={business} content={current} open={visualOpen} onClose={() => setVisualOpen(false)} onToast={onToast} />
    </div>
  );
}
