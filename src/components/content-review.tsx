"use client";

import * as React from "react";
import { useStore } from "@/lib/store";
import { useGenerators } from "@/lib/generators";
import { Badge, Button, Card, Modal } from "@/components/ui";
import { ContentPreview } from "@/components/content-preview";
import { CONTENT_FEEDBACK, applyStructuredFeedback } from "@/lib/feedback";
import { FORMAT_LABELS } from "@/lib/constants";
import { formatDate, cn } from "@/lib/utils";
import type { Business, ContentItem } from "@/lib/types";
import {
  Check,
  Pencil,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  PartyPopper,
  ImageIcon,
  CalendarClock,
  MessageSquarePlus,
} from "lucide-react";

const PENDING = (c: ContentItem) => c.status !== "aprobado";

// Tag de tipo de pieza legible (Feed / Reel / Story / Carrusel…)
function typeTag(format: string): string {
  if (format === "reel") return "Reel";
  if (format === "story") return "Story";
  if (format === "carrusel") return "Carrusel";
  if (format === "ad") return "Anuncio";
  if (format === "email") return "Email";
  return "Feed";
}

// ── Modal de "Modificar contenido" ───────────────────────────
export function ContentModifyModal({
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
  const calendars = useStore((s) => s.calendars);
  const updateCalendarItem = useStore((s) => s.updateCalendarItem);

  const [selected, setSelected] = React.useState<string[]>([]);
  const [changeImage, setChangeImage] = React.useState(false);
  const [changeDate, setChangeDate] = React.useState(false);
  const [newDate, setNewDate] = React.useState("");
  const [showCustom, setShowCustom] = React.useState(false);
  const [custom, setCustom] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // Reset al abrir otra pieza
  React.useEffect(() => {
    if (open) {
      setSelected([]);
      setChangeImage(false);
      setChangeDate(false);
      setNewDate("");
      setShowCustom(false);
      setCustom("");
    }
  }, [open, content?.id]);

  const toggle = (v: string) =>
    setSelected((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));

  const canApply =
    selected.length > 0 || changeImage || (changeDate && !!newDate) || custom.trim().length > 0;

  async function apply() {
    setLoading(true);
    try {
      if (changeImage) {
        await gen.generateImage(content, business);
      }
      if (changeDate && newDate && content.calendarItemId) {
        const items = calendars[business.id] || [];
        const item = items.find((it) => it.id === content.calendarItemId);
        if (item) updateCalendarItem({ ...item, date: newDate });
      }
      const instruction = applyStructuredFeedback(CONTENT_FEEDBACK, selected, custom);
      if (instruction.trim()) {
        await gen.applyFeedback(business, content, instruction);
      }
      onToast("Listo. Eva aplicó tus cambios ✨");
      onClose();
    } catch (e: any) {
      onToast(e?.message || "No se pudo aplicar. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition",
        active
          ? "border-loca-500 bg-loca-50 text-loca-700"
          : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
      )}
    >
      {children}
    </button>
  );

  return (
    <Modal open={open} onClose={onClose} title="Modificar contenido">
      <div className="space-y-4">
        <p className="text-sm text-zinc-500">Elegí qué cambiar. Eva lo aplica por vos.</p>
        <div className="flex flex-wrap gap-2">
          {CONTENT_FEEDBACK.map((o) => (
            <Chip key={o.value} active={selected.includes(o.value)} onClick={() => toggle(o.value)}>
              {o.label}
            </Chip>
          ))}
          <Chip active={changeImage} onClick={() => setChangeImage((v) => !v)}>
            <ImageIcon className="h-3.5 w-3.5" /> Cambiar imagen
          </Chip>
          <Chip active={changeDate} onClick={() => setChangeDate((v) => !v)}>
            <CalendarClock className="h-3.5 w-3.5" /> Cambiar fecha
          </Chip>
          <Chip active={showCustom} onClick={() => setShowCustom((v) => !v)}>
            <MessageSquarePlus className="h-3.5 w-3.5" /> Dar feedback personalizado
          </Chip>
        </div>

        {changeDate && (
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="loca-input"
          />
        )}

        {showCustom && (
          <textarea
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Contale a Eva con tus palabras qué querés cambiar…"
            className="loca-input min-h-[80px]"
          />
        )}

        <Button className="w-full" size="lg" disabled={!canApply} loading={loading} onClick={apply}>
          Aplicar cambios con Eva
        </Button>
      </div>
    </Modal>
  );
}

// ── Deck de revisión (una pieza por vez, modo presentación) ──
export function ContentReviewDeck({
  business,
  contents,
  onToast,
}: {
  business: Business;
  contents: ContentItem[];
  onToast: (m: string) => void;
}) {
  const updateContent = useStore((s) => s.updateContent);
  const calendars = useStore((s) => s.calendars);

  const [index, setIndex] = React.useState(0);
  const [modifyOpen, setModifyOpen] = React.useState(false);

  // Orden estable por fecha de calendario (si existe), luego por creación.
  const dateOf = React.useCallback(
    (c: ContentItem) => {
      const items = calendars[business.id] || [];
      return items.find((it) => it.id === c.calendarItemId)?.date || c.createdAt.slice(0, 10);
    },
    [calendars, business.id]
  );

  const ordered = React.useMemo(
    () => [...contents].sort((a, b) => dateOf(a).localeCompare(dateOf(b))),
    [contents, dateOf]
  );

  const pendingCount = ordered.filter(PENDING).length;

  // Clamp del índice si cambia la lista
  React.useEffect(() => {
    if (index > ordered.length - 1) setIndex(Math.max(0, ordered.length - 1));
  }, [ordered.length, index]);

  // Todo aprobado → pantalla final
  if (pendingCount === 0 && ordered.length > 0) {
    return (
      <Card className="flex flex-col items-center px-6 py-14 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <PartyPopper className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-zinc-900">Todo aprobado 🎉</h2>
        <p className="mt-1 max-w-sm text-sm text-zinc-500">
          Tus contenidos están listos para publicar.
        </p>
      </Card>
    );
  }

  const current = ordered[index];
  if (!current) return null;

  function goNextPending(fromIdx: number) {
    for (let i = fromIdx + 1; i < ordered.length; i++) {
      if (PENDING(ordered[i])) return setIndex(i);
    }
    // buscar desde el principio
    for (let i = 0; i < ordered.length; i++) {
      if (PENDING(ordered[i])) return setIndex(i);
    }
  }

  function approve() {
    updateContent(current.id, { status: "aprobado" });
    onToast("Aprobado. Vamos con la siguiente.");
    goNextPending(index);
  }

  return (
    <div className="space-y-4">
      {/* Progreso */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-500">
          Pieza {index + 1} de {ordered.length}
        </span>
        <span className="text-sm text-zinc-400">{pendingCount} sin aprobar</span>
      </div>

      {/* Pieza centrada, estilo red social */}
      <div className="relative mx-auto w-full max-w-[440px]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="rounded-full border border-zinc-200 bg-white p-2 text-zinc-500 shadow-sm transition hover:bg-zinc-50 disabled:opacity-40"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <Badge tone="pink">{current.channel}</Badge>
            <Badge>{typeTag(current.format)}</Badge>
            {current.status === "aprobado" && <Badge tone="green">Aprobada</Badge>}
          </div>
          <button
            onClick={() => setIndex((i) => Math.min(ordered.length - 1, i + 1))}
            disabled={index === ordered.length - 1}
            className="rounded-full border border-zinc-200 bg-white p-2 text-zinc-500 shadow-sm transition hover:bg-zinc-50 disabled:opacity-40"
            aria-label="Siguiente"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3">
          <ContentPreview content={current} business={business} />
        </div>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-zinc-400">
          <CalendarDays className="h-4 w-4" /> {formatDate(dateOf(current))}
        </p>

        {/* Caption */}
        <Card className="mt-3 p-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{current.caption}</p>
          {current.hashtags.length > 0 && (
            <p className="mt-2 text-sm text-loca-600">{current.hashtags.join(" ")}</p>
          )}
        </Card>

        {/* Acciones: aprobar (verde, grande) + modificar (secundario, lápiz) */}
        <div className="mt-4 flex items-center gap-2">
          <Button variant="success" size="lg" className="flex-1" onClick={approve}>
            <Check className="h-4 w-4" /> Aprobar
          </Button>
          <Button variant="ghost" size="md" onClick={() => setModifyOpen(true)}>
            <Pencil className="h-4 w-4" /> Modificar
          </Button>
        </div>
      </div>

      <ContentModifyModal
        business={business}
        content={current}
        open={modifyOpen}
        onClose={() => setModifyOpen(false)}
        onToast={onToast}
      />
    </div>
  );
}
