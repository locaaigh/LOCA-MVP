"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useGenerators } from "@/lib/generators";
import { Badge, Button, Card, Field, Input, Modal, Select, Textarea, useToast } from "@/components/ui";
import { ContentPreview } from "@/components/content-preview";
import { FeedbackPanel } from "@/components/flow";
import { CONTENT_FEEDBACK, applyStructuredFeedback } from "@/lib/feedback";
import { FORMAT_LABELS, IMAGE_FORMAT_LABELS, CONTENT_STATUS_LABELS } from "@/lib/constants";
import { isLocked, isPublished, datePassed } from "@/lib/content-status";
import { copyToClipboard, downloadDataUrl } from "@/lib/utils";
import {
  ArrowLeft,
  Check,
  X,
  Copy,
  Download,
  ImageIcon,
  Loader2,
  Lock,
  Unlock,
} from "lucide-react";
import type { ContentItem, ImageFormat } from "@/lib/types";

export default function ContentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const content = useStore((s) => s.contents.find((c) => c.id === id));
  const business = useStore((s) =>
    content ? s.businesses.find((b) => b.id === content.businessId) || null : null
  );
  const updateContent = useStore((s) => s.updateContent);
  const deleteContent = useStore((s) => s.deleteContent);
  const calendars = useStore((s) => s.calendars);
  const gen = useGenerators();
  const { show, node } = useToast();

  const [imgLoading, setImgLoading] = useState(false);
  const [fbLoading, setFbLoading] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);

  // La burbuja de Eva puede pedir modificar contenido o imagen → scrolleamos a la sección.
  useEffect(() => {
    const onEva = (e: Event) => {
      const action = (e as CustomEvent).detail?.action;
      const id = action === "imagen" ? "modificar-imagen" : action === "modificar" ? "modificar-contenido" : null;
      if (id) document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    window.addEventListener("eva:action", onEva);
    return () => window.removeEventListener("eva:action", onEva);
  }, []);

  if (!content || !business) {
    return (
      <Card className="text-center">
        <p className="text-zinc-500">No se encontró la pieza.</p>
        <Link href="/content">
          <Button className="mt-3" variant="outline">Volver al estudio</Button>
        </Link>
      </Card>
    );
  }

  const c = content;
  const patch = (p: Partial<ContentItem>) => updateContent(c.id, p);

  const itemDate =
    (c.calendarItemId ? (calendars[c.businessId] || []).find((it) => it.id === c.calendarItemId)?.date : undefined) ||
    c.createdAt.slice(0, 10);
  const locked = isLocked(c, itemDate);
  const published = isPublished(c, itemDate);

  function reopen() {
    patch({ status: "needs_changes" });
    setReopenOpen(false);
    show("Edición reabierta. Volvió a pendiente de revisión.");
  }

  async function genImage() {
    setImgLoading(true);
    try {
      const res = await gen.generateImage(c, business!);
      show(res.provider === "mock" ? "Imagen simulada (modo demo)" : "Imagen generada ✨");
    } catch (e: any) {
      show(e?.message || "Error al generar imagen");
    } finally {
      setImgLoading(false);
    }
  }

  async function applyFeedback(instruction: string) {
    if (!instruction.trim()) return;
    setFbLoading(true);
    try {
      const res = await gen.applyFeedback(business!, c, instruction);
      show(res.meta?.warning || "Pieza actualizada ✨");
    } catch (e: any) {
      show(e?.message || "Error");
    } finally {
      setFbLoading(false);
    }
  }

  async function copy(text: string, label: string) {
    const ok = await copyToClipboard(text);
    show(ok ? `${label} copiado` : "No se pudo copiar");
  }

  return (
    <div className="space-y-5">
      {node}
      <div className="flex items-center justify-between">
        <Link href="/content" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800">
          <ArrowLeft className="h-4 w-4" /> Volver a contenidos
        </Link>
        <div className="flex items-center gap-2">
          <Badge tone="default">Detalle interno</Badge>
          <Badge tone="pink">{c.channel}</Badge>
          <Badge>{FORMAT_LABELS[c.format]}</Badge>
        </div>
      </div>

      {/* Protección: contenido aprobado/publicado */}
      {locked && (
        <Card className="flex flex-col items-start justify-between gap-3 border-emerald-200 bg-emerald-50/60 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-800">
                {published ? "Este contenido ya fue publicado" : "Este contenido está aprobado"}
              </p>
              <p className="text-sm text-emerald-700">
                Está protegido para que no se edite por accidente. Reabrí la edición si necesitás cambiarlo.
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => setReopenOpen(true)}>
            <Unlock className="h-4 w-4" /> Reabrir edición
          </Button>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Columna preview + imagen */}
        <div className="space-y-4">
          <ContentPreview content={c} business={business} />

          <Card className="space-y-3" id="modificar-imagen">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Imagen</h3>
              <ImageStatusBadge status={c.imageStatus} provider={c.imageProvider} />
            </div>
            <Field label="Formato de imagen">
              <Select
                value={c.imageFormat}
                onChange={(e) => patch({ imageFormat: e.target.value as ImageFormat })}
                disabled={locked}
              >
                {Object.entries(IMAGE_FORMAT_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
            </Field>
            <Field label="Prompt de imagen">
              <Textarea
                value={c.imagePrompt}
                onChange={(e) => patch({ imagePrompt: e.target.value })}
                className="min-h-[80px] text-xs"
                disabled={locked}
              />
            </Field>
            {c.imageError && <p className="text-xs text-red-500">{c.imageError}</p>}
            <div className="flex flex-wrap gap-2">
              <Button onClick={genImage} loading={imgLoading} disabled={locked}>
                <ImageIcon className="h-4 w-4" />
                {c.imageUrl ? "Modificar imagen" : "Generar imagen"}
              </Button>
              <Button variant="outline" onClick={() => copy(c.imagePrompt, "Prompt")}>
                <Copy className="h-4 w-4" /> Copiar prompt
              </Button>
              {c.imageUrl && (
                <Button
                  variant="outline"
                  onClick={() =>
                    downloadDataUrl(
                      `${c.title.slice(0, 30).replace(/\s+/g, "-")}.png`,
                      c.imageUrl!
                    )
                  }
                >
                  <Download className="h-4 w-4" /> Descargar
                </Button>
              )}
            </div>
            <p className="text-xs text-zinc-400">{c.visualConcept}</p>
          </Card>

          {/* Video / Foto brief */}
          {c.videoScript && (
            <Card className="space-y-2">
              <h3 className="font-semibold">Guion de video / reel</h3>
              <p className="text-sm text-zinc-600">{c.videoScript.concept}</p>
              <p className="text-xs text-zinc-400">Duración: {c.videoScript.durationSeconds}s · Música: {c.videoScript.music}</p>
              <div className="space-y-2">
                {c.videoScript.scenes.map((s, i) => (
                  <div key={i} className="rounded-lg bg-zinc-50 p-2 text-sm">
                    <p className="font-medium">Escena {i + 1}: {s.scene}</p>
                    <p className="text-xs text-zinc-500">📝 En pantalla: {s.onScreenText}</p>
                    <p className="text-xs text-zinc-500">🎙️ Voz: {s.voiceover}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {c.photoBrief && (
            <Card className="space-y-2">
              <h3 className="font-semibold">Brief fotográfico</h3>
              <p className="text-sm text-zinc-600">{c.photoBrief.idea}</p>
              <p className="text-xs text-zinc-500"><strong>Shot list:</strong> {c.photoBrief.shotList.join(", ")}</p>
              <p className="text-xs text-zinc-500"><strong>Props:</strong> {c.photoBrief.props.join(", ")}</p>
              <p className="text-xs text-zinc-500"><strong>Composición:</strong> {c.photoBrief.composition}</p>
            </Card>
          )}
        </div>

        {/* Columna texto + acciones */}
        <div className="space-y-4">
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Texto de la pieza</h3>
              <StatusSelect value={c.status} onChange={(v) => patch({ status: v as any })} disabled={locked} />
            </div>
            <fieldset disabled={locked} className="space-y-3 disabled:opacity-70">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Fecha de publicación">
                  <Input
                    type="date"
                    value={c.scheduledDate || ""}
                    onChange={(e) => patch({ scheduledDate: e.target.value })}
                  />
                </Field>
                <Field label="Horario">
                  <Input
                    type="time"
                    value={c.scheduledTime || ""}
                    onChange={(e) => patch({ scheduledTime: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Título interno">
                <Input value={c.title} onChange={(e) => patch({ title: e.target.value })} />
              </Field>
              <Field label="Hook">
                <Input value={c.hook} onChange={(e) => patch({ hook: e.target.value })} />
              </Field>
              <Field label="Caption">
                <Textarea
                  value={c.caption}
                  onChange={(e) => patch({ caption: e.target.value })}
                  className="min-h-[120px]"
                />
              </Field>
              <Field label="Body copy">
                <Textarea value={c.body} onChange={(e) => patch({ body: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="CTA">
                  <Input value={c.cta} onChange={(e) => patch({ cta: e.target.value })} />
                </Field>
                <Field label="Texto sobre imagen">
                  <Input value={c.designTextOverlay} onChange={(e) => patch({ designTextOverlay: e.target.value })} />
                </Field>
              </div>
              <Field label="Hashtags">
                <Input
                  value={c.hashtags.join(" ")}
                  onChange={(e) => patch({ hashtags: e.target.value.split(/\s+/).filter(Boolean) })}
                />
              </Field>
            </fieldset>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => copy(c.caption, "Caption")}>
                <Copy className="h-4 w-4" /> Copiar caption
              </Button>
              <Button size="sm" variant="outline" onClick={() => copy(c.hashtags.join(" "), "Hashtags")}>
                <Copy className="h-4 w-4" /> Copiar hashtags
              </Button>
            </div>
          </Card>

          {/* Decisión */}
          <Card className="space-y-3">
            <h3 className="font-semibold">Decisión</h3>
            {locked ? (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                <Check className="h-4 w-4" />
                {published ? "Publicado" : "Aprobado"} · {CONTENT_STATUS_LABELS[c.status] || c.status}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button variant="success" onClick={() => { patch({ status: "aprobado" }); show("Aprobado ✅"); }}>
                  <Check className="h-4 w-4" /> Aprobar
                </Button>
                <Button variant="outline" onClick={() => { patch({ status: "rechazado" }); show("Rechazado"); }}>
                  <X className="h-4 w-4" /> Rechazar
                </Button>
              </div>
            )}
          </Card>

          {/* Modificar contenido */}
          <div id="modificar-contenido">
            {locked ? (
              <Card className="text-sm text-zinc-500">
                Para modificar este contenido, primero reabrí la edición arriba.
              </Card>
            ) : (
              <FeedbackPanel
                title="Modificar contenido"
                options={CONTENT_FEEDBACK}
                loading={fbLoading}
                onApply={(values, custom) =>
                  applyFeedback(applyStructuredFeedback(CONTENT_FEEDBACK, values, custom))
                }
              />
            )}
            {c.feedbackHistory.length > 0 && (
              <div className="mt-2">
                <p className="mb-1 text-xs font-medium text-zinc-400">Cambios aplicados</p>
                <div className="flex flex-wrap gap-1">
                  {c.feedbackHistory.map((f) => (
                    <Badge key={f.id}>{f.feedback}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              deleteContent(c.id);
              router.push("/content");
            }}
            className="text-sm text-red-500 hover:underline"
          >
            Eliminar pieza
          </button>
        </div>
      </div>

      {/* Confirmación de reabrir edición */}
      <Modal open={reopenOpen} onClose={() => setReopenOpen(false)} title="Reabrir edición">
        <p className="text-sm text-zinc-600">
          Este contenido ya fue aprobado. Si lo editás, volverá a estado pendiente de revisión. ¿Querés continuar?
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button variant="primary" size="lg" className="flex-1" onClick={reopen}>
            <Unlock className="h-4 w-4" /> Sí, reabrir edición
          </Button>
          <Button variant="ghost" size="lg" className="flex-1" onClick={() => setReopenOpen(false)}>
            Cancelar
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function ImageStatusBadge({ status, provider }: { status: string; provider?: string }) {
  if (status === "generando")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
        <Loader2 className="h-3 w-3 animate-spin" /> Generando…
      </span>
    );
  if (status === "generada")
    return <Badge tone={provider === "openai" ? "green" : "yellow"}>{provider === "openai" ? "Imagen IA" : "Modo demo: simulada"}</Badge>;
  if (status === "error") return <Badge tone="red">Error</Badge>;
  return <Badge>Pendiente</Badge>;
}

function StatusSelect({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="h-8 w-44 text-xs">
      <option value="borrador">Borrador</option>
      <option value="generado">Generado</option>
      <option value="pending_review">Pendiente de revisión</option>
      <option value="needs_changes">Necesita cambios</option>
      <option value="aprobado">Aprobado</option>
      <option value="rechazado">Rechazado</option>
      <option value="published">Publicado</option>
      <option value="archived">Archivado</option>
    </Select>
  );
}
