"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useGenerators } from "@/lib/generators";
import { Badge, Button, Card, Field, Input, Modal, Textarea } from "@/components/ui";
import { ContentPreview } from "@/components/content-preview";
import { PlatformLogo, PlatformLogos, contentPlatforms } from "@/components/platform-logo";
import { FORMAT_LABELS } from "@/lib/constants";
import { bucketOf } from "@/lib/content-status";
import { nowIso } from "@/lib/utils";
import { track } from "@/lib/analytics";
import type { Business, ContentItem } from "@/lib/types";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  PartyPopper,
  ImageIcon,
  PencilLine,
  Sparkles,
} from "lucide-react";

function typeTag(format: string): string {
  if (format === "reel") return "Reel";
  if (format === "story") return "Story";
  if (format === "carrusel") return "Carrusel";
  if (format === "ad") return "Anuncio";
  if (format === "email") return "Email";
  return "Feed";
}

// Fecha y horario en formato limpio: "04/06/26 · 14:20 hs"
function publishLabel(dateIso: string, time?: string): string {
  let datePart = dateIso;
  try {
    const d = new Date(dateIso);
    datePart = d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  } catch {
    /* noop */
  }
  return time ? `${datePart} · ${time} hs` : datePart;
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
    if (edited.length > 0) {
      track("content_manual_edited", { contentId: content.id, fields: edited });
    }
    onToast("Cambios guardados (sin usar IA) ✏️");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Editar copy y fecha">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Editás vos, sin usar IA ni gastar créditos. La pieza sigue aprobada.</p>
        {/* Copy primero y grande: es lo que más se lee/edita */}
        <Field label="Copy / caption">
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="min-h-[300px] text-[15px] leading-relaxed"
          />
        </Field>
        {/* Fecha y horario: compactos, en una franja fina */}
        <div className="flex flex-wrap items-end gap-3 rounded-xl bg-surface-subtle p-3">
          <Field label="Fecha de publicación" className="flex-1">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Horario" className="w-32">
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>
        <Button variant="success" size="lg" className="w-full" onClick={save}>
          <Check className="h-4 w-4" /> Guardar cambios
        </Button>
      </div>
    </Modal>
  );
}

// Tags de feedback visual que ve el cliente (sin tecnicismos ni prompts).
const VISUAL_FEEDBACK_TAGS = [
  "No representa mi marca",
  "Producto equivocado",
  "Servicio equivocado",
  "Persona/escena incorrecta",
  "Estilo visual incorrecto",
  "Colores incorrectos",
  "Baja calidad",
  "Texto en imagen incorrecto",
  "Formato incorrecto",
  "Quiero algo más premium",
  "Quiero algo más simple",
  "Otro",
];

// ── Cambiar imagen/video: feedback simple por tags (sin prompt/concepto) ───
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
  const updateContent = useStore((s) => s.updateContent);
  const gen = useGenerators();
  const [tags, setTags] = React.useState<string[]>([]);
  const [otherText, setOtherText] = React.useState("");
  const [comment, setComment] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setTags(content.selectedVisualFeedbackTags || []);
      setOtherText("");
      setComment("");
    }
  }, [open, content.id]);

  const usedChange = (content.visualChangeCount || 0) >= 1;
  const hasOther = tags.includes("Otro");
  const canSend = tags.length > 0 || otherText.trim().length > 0 || comment.trim().length > 0;

  const toggle = (t: string) =>
    setTags((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));

  async function send() {
    if (usedChange) {
      onToast("Ya usaste el cambio incluido para esta pieza.");
      return;
    }
    const customParts = [hasOther && otherText.trim() ? otherText.trim() : "", comment.trim()].filter(Boolean);
    const customFeedback = customParts.join(" — ") || undefined;
    track(
      "content_visual_change_requested",
      { contentId: content.id, tags: tags.filter((t) => t !== "Otro"), hasCustom: !!customFeedback },
      { businessId: content.businessId }
    );

    // Ajustar el prompt de imagen con el feedback del cliente (el cliente no lo ve).
    const feedbackBits = [...tags.filter((t) => t !== "Otro"), customFeedback].filter(Boolean);
    const adjustedPrompt = feedbackBits.length
      ? `${content.imagePrompt}\n\nAJUSTES PEDIDOS POR EL CLIENTE (corregí esto en la imagen): ${feedbackBits.join("; ")}.`
      : content.imagePrompt;

    // Estado "generando" + SIN imagen anterior → se ve "Eva trabajando", no la vieja.
    const updated: ContentItem = {
      ...content,
      imagePrompt: adjustedPrompt,
      imageUrl: undefined,
      imageStatus: "generando",
      imageError: undefined,
      selectedVisualFeedbackTags: tags,
      customVisualFeedback: customFeedback,
      visualChangeRequestedAt: nowIso(),
      visualChangeCount: (content.visualChangeCount || 0) + 1,
      status: "needs_changes",
    };
    updateContent(content.id, {
      imagePrompt: adjustedPrompt,
      imageUrl: undefined,
      imageStatus: "generando",
      imageError: undefined,
      selectedVisualFeedbackTags: updated.selectedVisualFeedbackTags,
      customVisualFeedback: updated.customVisualFeedback,
      visualChangeRequestedAt: updated.visualChangeRequestedAt,
      visualChangeCount: updated.visualChangeCount,
      status: "needs_changes",
    });
    onToast("Eva está preparando la nueva imagen… ✨");
    onClose();

    // Regenerar de verdad (setea generando, sincroniza el prompt nuevo y crea la imagen).
    try {
      await gen.generateImage(updated, business);
      onToast("Nueva imagen lista 🎨");
    } catch (e: any) {
      onToast(e?.message || "No se pudo generar la nueva imagen. Reintentá.");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="¿Qué querés cambiar de la imagen/video?">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Elegí qué no te convence. Eva va a usar este feedback para preparar una nueva versión.
        </p>

        <ContentPreview content={content} business={business} className="!shadow-none" />

        {usedChange ? (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm font-medium text-amber-800 dark:text-amber-200 ring-1 ring-inset ring-amber-100 dark:ring-amber-900">
            Ya usaste el cambio incluido para esta pieza.
          </div>
        ) : (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm font-medium text-amber-800 dark:text-amber-200 ring-1 ring-inset ring-amber-100 dark:ring-amber-900">
            Recordá: tu plan incluye 1 cambio por contenido.
          </div>
        )}

        <fieldset disabled={usedChange} className="space-y-4 disabled:opacity-60">
          <div className="flex flex-wrap gap-2">
            {VISUAL_FEEDBACK_TAGS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggle(t)}
                className={
                  "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition " +
                  (tags.includes(t)
                    ? "border-loca-400 bg-accent-subtle-bg text-accent-subtle-fg ring-2 ring-accent-subtle-ring"
                    : "border-border bg-card text-muted-foreground-2 hover:border-border-strong hover:bg-surface-subtle")
                }
              >
                {t}
              </button>
            ))}
          </div>

          {hasOther && (
            <Field label="Contanos qué querés cambiar">
              <Textarea value={otherText} onChange={(e) => setOtherText(e.target.value)} className="min-h-[70px]" placeholder="Describí qué te gustaría distinto…" />
            </Field>
          )}

          <Field label="Agregá un comentario para Eva (opcional)">
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} className="min-h-[60px]" placeholder="Ej: que se vea el local de fondo." />
          </Field>
        </fieldset>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="primary" size="lg" className="flex-1" onClick={send} disabled={usedChange || !canSend}>
            <Sparkles className="h-4 w-4" /> Enviar cambio a Eva
          </Button>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancelar
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
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300">
          <PartyPopper className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-foreground">Todo aprobado 🎉</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">Tus contenidos están listos para publicar.</p>
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
    // firstPass = "aprobado de una": sin feedback de copy, sin edición
    // manual y sin cambio de imagen (campos de auditoría del ContentItem).
    track(
      "content_approved",
      {
        contentId: current.id,
        format: current.format,
        channel: current.channel,
        firstPass:
          (current.feedbackHistory?.length ?? 0) === 0 &&
          (current.manuallyEditedFields?.length ?? 0) === 0 &&
          (current.visualChangeCount ?? 0) === 0,
      },
      { businessId: current.businessId }
    );
    onToast("Aprobado. Vamos con la siguiente.");
    goNextPending(index);
  }

  const platforms = contentPlatforms(current.channel, current.distributionPlatforms, business.marketingChannels);

  return (
    <div className="space-y-3">
      {/* Encabezado compacto: plataforma + formato · progreso + navegación (item 9) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <PlatformLogos channels={platforms} size={32} />
          <div>
            <p className="text-sm font-bold leading-tight text-foreground">{platforms.join(" + ")}</p>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">{typeTag(current.format)}</span>
              {current.status === "needs_changes" && <Badge tone="yellow">Con cambios</Badge>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-faint">
            Pieza {index + 1}/{ordered.length} · {pendingCount} sin aprobar
          </span>
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="rounded-full border border-border bg-card p-1.5 text-muted-foreground transition hover:bg-surface-subtle disabled:opacity-40"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIndex((i) => Math.min(ordered.length - 1, i + 1))}
            disabled={index === ordered.length - 1}
            className="rounded-full border border-border bg-card p-1.5 text-muted-foreground transition hover:bg-surface-subtle disabled:opacity-40"
            aria-label="Siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Desktop: visual izquierda, copy/datos derecha */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mx-auto max-w-[440px] lg:mx-0">
            <ContentPreview content={current} business={business} />
            <div className="mt-3 flex items-center justify-center gap-2 lg:justify-start">
              <CalendarClock className="h-4 w-4 text-loca-500" />
              <span className="text-sm font-semibold text-foreground-muted">{publishLabel(dateOf(current), current.scheduledTime)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="overflow-hidden p-5">
            <p className="overflow-wrap-anywhere whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground-muted">{current.caption}</p>
          </Card>

          <div className="space-y-2.5">
            <Button variant="success" size="xl" className="w-full" onClick={approve}>
              <Check className="h-5 w-5" /> Aprobar
            </Button>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <Button variant="outline" size="lg" className="flex-1" onClick={() => setManualOpen(true)}>
                <PencilLine className="h-4 w-4" /> Editar copy y fecha
              </Button>
              <Button variant="outline" size="lg" className="flex-1" onClick={() => setVisualOpen(true)}>
                <ImageIcon className="h-4 w-4" /> Cambiar imagen/video
              </Button>
            </div>
            <p className="text-center text-xs text-faint">
              Este contenido incluye <span className="font-semibold text-muted-foreground">1 cambio</span>. Editar copy/fecha/hora no lo consume.
            </p>
          </div>
        </div>
      </div>

      <ContentManualEditModal content={current} open={manualOpen} onClose={() => setManualOpen(false)} onToast={onToast} />
      <ContentVisualEditModal business={business} content={current} open={visualOpen} onClose={() => setVisualOpen(false)} onToast={onToast} />
    </div>
  );
}
