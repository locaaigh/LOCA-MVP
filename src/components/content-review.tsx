"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Badge, Button, Card, Field, Input, Modal, Textarea } from "@/components/ui";
import { ContentPreview } from "@/components/content-preview";
import { PlatformLogo, PlatformLogos, contentPlatforms } from "@/components/platform-logo";
import { FORMAT_LABELS } from "@/lib/constants";
import { bucketOf } from "@/lib/content-status";
import { nowIso } from "@/lib/utils";
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

  function send() {
    if (usedChange) {
      onToast("Ya usaste el cambio incluido para esta pieza.");
      return;
    }
    // El feedback del cliente queda guardado para que Eva prepare la nueva versión.
    // (Internamente puede alimentar prompt/concepto, pero el cliente no los ve.)
    const customParts = [hasOther && otherText.trim() ? otherText.trim() : "", comment.trim()].filter(Boolean);
    updateContent(content.id, {
      selectedVisualFeedbackTags: tags,
      customVisualFeedback: customParts.join(" — ") || undefined,
      visualChangeRequestedAt: nowIso(),
      visualChangeCount: (content.visualChangeCount || 0) + 1,
      // Cambiar el visual hace que la pieza vuelva a revisión.
      status: "needs_changes" as const,
    });
    onToast("Cambio enviado a Eva. La pieza volvió a revisión.");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="¿Qué querés cambiar de la imagen/video?">
      <div className="space-y-4">
        <p className="text-sm text-zinc-500">
          Elegí qué no te convence. Eva va a usar este feedback para preparar una nueva versión.
        </p>

        <ContentPreview content={content} business={business} className="!shadow-none" />

        {usedChange ? (
          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 ring-1 ring-inset ring-amber-100">
            Ya usaste el cambio incluido para esta pieza.
          </div>
        ) : (
          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 ring-1 ring-inset ring-amber-100">
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
                    ? "border-loca-400 bg-loca-50 text-loca-700 ring-2 ring-loca-100"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50")
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

      {/* Plataforma(s) con logo (crosspost si aplica) · formato */}
      {(() => {
        const platforms = contentPlatforms(current.channel, current.distributionPlatforms, business.marketingChannels);
        return (
          <div className="flex items-center gap-3">
            <PlatformLogos channels={platforms} size={40} />
            <div>
              <p className="text-[15px] font-bold leading-tight text-zinc-900">{platforms.join(" + ")}</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="text-xs font-medium text-zinc-500">
                  {typeTag(current.format)}
                  {platforms.length > 1 ? " · se publica en varias redes" : ""}
                </span>
                {current.status === "needs_changes" && <Badge tone="yellow">Con cambios</Badge>}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Desktop: visual izquierda, copy/datos derecha */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mx-auto max-w-[440px] lg:mx-0">
            <ContentPreview content={current} business={business} />
            <div className="mt-3 flex items-center justify-center gap-2 lg:justify-start">
              <CalendarClock className="h-4 w-4 text-loca-500" />
              <span className="text-sm font-semibold text-zinc-700">{publishLabel(dateOf(current), current.scheduledTime)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="overflow-hidden p-5">
            <p className="overflow-wrap-anywhere whitespace-pre-wrap break-words text-[15px] leading-relaxed text-zinc-700">{current.caption}</p>
            {current.hashtags.length > 0 && <p className="overflow-wrap-anywhere mt-3 break-words text-sm font-medium text-loca-600">{current.hashtags.join(" ")}</p>}
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
            <p className="text-center text-xs text-zinc-400">
              Este contenido incluye <span className="font-semibold text-zinc-500">1 cambio</span>. Editar copy/fecha/hora no lo consume.
            </p>
          </div>
        </div>
      </div>

      <ContentManualEditModal content={current} open={manualOpen} onClose={() => setManualOpen(false)} onToast={onToast} />
      <ContentVisualEditModal business={business} content={current} open={visualOpen} onClose={() => setVisualOpen(false)} onToast={onToast} />
    </div>
  );
}
