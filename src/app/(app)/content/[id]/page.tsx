"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useGenerators } from "@/lib/generators";
import { Badge, Button, Card, Field, Input, Select, Textarea, useToast } from "@/components/ui";
import { ContentPreview } from "@/components/content-preview";
import { FeedbackPanel } from "@/components/flow";
import { CONTENT_FEEDBACK, applyStructuredFeedback } from "@/lib/feedback";
import { FORMAT_LABELS, IMAGE_FORMAT_LABELS } from "@/lib/constants";
import { copyToClipboard, downloadDataUrl } from "@/lib/utils";
import {
  ArrowLeft,
  Check,
  X,
  Copy,
  Download,
  ImageIcon,
  Loader2,
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
  const gen = useGenerators();
  const { show, node } = useToast();

  const [imgLoading, setImgLoading] = useState(false);
  const [fbLoading, setFbLoading] = useState(false);

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
              />
            </Field>
            {c.imageError && <p className="text-xs text-red-500">{c.imageError}</p>}
            <div className="flex flex-wrap gap-2">
              <Button onClick={genImage} loading={imgLoading}>
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
              <StatusSelect value={c.status} onChange={(v) => patch({ status: v as any })} />
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
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => copy(c.caption, "Caption")}>
                <Copy className="h-4 w-4" /> Copiar caption
              </Button>
              <Button size="sm" variant="outline" onClick={() => copy(c.hashtags.join(" "), "Hashtags")}>
                <Copy className="h-4 w-4" /> Copiar hashtags
              </Button>
            </div>
          </Card>

          {/* Aprobar / rechazar */}
          <Card className="space-y-3">
            <h3 className="font-semibold">Decisión</h3>
            <div className="flex flex-wrap gap-2">
              <Button variant="lima" onClick={() => { patch({ status: "aprobado" }); show("Aprobado ✅"); }}>
                <Check className="h-4 w-4" /> Aprobar
              </Button>
              <Button variant="outline" onClick={() => { patch({ status: "rechazado" }); show("Rechazado"); }}>
                <X className="h-4 w-4" /> Rechazar
              </Button>
            </div>
            <Field label="Estado de publicación">
              <Select value={c.publishStatus} onChange={(e) => patch({ publishStatus: e.target.value as any })}>
                <option value="pendiente">Pendiente</option>
                <option value="listo_para_publicar">Listo para publicar</option>
                <option value="publicado_manualmente">Publicado manualmente</option>
              </Select>
            </Field>
          </Card>

          {/* Modificar contenido */}
          <div id="modificar-contenido">
            <FeedbackPanel
              title="Modificar contenido"
              options={CONTENT_FEEDBACK}
              loading={fbLoading}
              onApply={(values, custom) =>
                applyFeedback(applyStructuredFeedback(CONTENT_FEEDBACK, values, custom))
              }
            />
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

function StatusSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-40 text-xs">
      <option value="borrador">Borrador</option>
      <option value="generado">Generado</option>
      <option value="aprobado">Aprobado</option>
      <option value="rechazado">Rechazado</option>
      <option value="publicado_manualmente">Publicado manualmente</option>
    </Select>
  );
}
