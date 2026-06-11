"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore, useFlow } from "@/lib/store";
import { useGenerators } from "@/lib/generators";
import { exportContentsCsv } from "@/lib/exports";
import { Badge, Button, Card, EmptyState, EvaLoading, PageHeader, Select, useToast } from "@/components/ui";
import { ContentPreview } from "@/components/content-preview";
import { ProgressTracker, buildFlowSteps } from "@/components/flow";
import { CHANNELS, CONTENT_FORMATS, FORMAT_LABELS, CONTENT_STATUS_LABELS } from "@/lib/constants";
import { copyToClipboard } from "@/lib/utils";
import { Check, Copy, Download, Eye, FileText, Lock, Sparkles, Wand2 } from "lucide-react";
import type { ContentItem } from "@/lib/types";

const STATUS_TONE: Record<string, any> = {
  borrador: "default",
  generado: "blue",
  aprobado: "green",
  rechazado: "red",
  publicado_manualmente: "lima",
};

export default function ContentStudioPage() {
  const params = useSearchParams();
  const business = useStore((s) => s.businesses.find((b) => b.id === s.activeBusinessId) || null);
  const allContents = useStore((s) => s.contents);
  const setFlow = useStore((s) => s.setFlow);
  const flow = useFlow(business?.id);
  const gen = useGenerators();
  const { show, node } = useToast();

  const [fStatus, setFStatus] = useState("");
  const [fChannel, setFChannel] = useState("");
  const [fFormat, setFFormat] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const autoTriggered = useRef(false);

  const contents = useMemo(
    () => (business ? allContents.filter((c) => c.businessId === business.id) : []),
    [allContents, business]
  );
  const filtered = useMemo(
    () =>
      contents.filter(
        (c) =>
          (!fStatus || c.status === fStatus) &&
          (!fChannel || c.channel === fChannel) &&
          (!fFormat || c.format === fFormat)
      ),
    [contents, fStatus, fChannel, fFormat]
  );

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

  useEffect(() => {
    if (!business || autoTriggered.current) return;
    if (params.get("generate") === "1" && calendarApproved && contents.length === 0) {
      autoTriggered.current = true;
      generateAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business, calendarApproved, contents.length, params]);

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

  return (
    <div className="space-y-5">
      {node}
      <ProgressTracker steps={buildFlowSteps(flow, true)} />

      <PageHeader title="Estudio de contenidos" subtitle={`${contents.length} piezas para ${business.name}.`}>
        {contents.length > 0 && (
          <Button variant="outline" onClick={() => exportContentsCsv(business, filtered)}>
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
          description="Eva crea el texto de cada publicación de tu calendario."
        >
          <Button onClick={generateAll} loading={loading}>
            <Sparkles className="h-4 w-4" /> Generar contenidos del mes
          </Button>
        </EmptyState>
      ) : contents.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="h-9 w-44">
              <option value="">Todos los estados</option>
              {Object.entries(CONTENT_STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </Select>
            <Select value={fChannel} onChange={(e) => setFChannel(e.target.value)} className="h-9 w-40">
              <option value="">Todos los canales</option>
              {CHANNELS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
            <Select value={fFormat} onChange={(e) => setFFormat(e.target.value)} className="h-9 w-44">
              <option value="">Todos los formatos</option>
              {CONTENT_FORMATS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </Select>
            <Button size="sm" variant="ghost" onClick={generateAll} loading={loading}>
              <Sparkles className="h-4 w-4" /> Generar los que falten
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <ContentCard key={c.id} content={c} businessName={business.name} onToast={show} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function ContentCard({
  content: c,
  businessName,
  onToast,
}: {
  content: ContentItem;
  businessName: string;
  onToast: (m: string) => void;
}) {
  const router = useRouter();
  const business = useStore((s) => s.businesses.find((b) => b.id === c.businessId) || null);
  const updateContent = useStore((s) => s.updateContent);
  const approved = c.status === "aprobado";

  return (
    <Card className="flex h-full flex-col gap-3 p-3 transition hover:-translate-y-0.5 hover:shadow-pop">
      <Link href={`/content/${c.id}`} className="block">
        {business && <ContentPreview content={c} business={business} className="!shadow-none" />}
      </Link>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone="pink">{c.channel}</Badge>
        <Badge>{FORMAT_LABELS[c.format]}</Badge>
        <Badge tone={STATUS_TONE[c.status]}>{CONTENT_STATUS_LABELS[c.status]}</Badge>
      </div>
      <Link href={`/content/${c.id}`} className="block">
        <p className="line-clamp-1 text-sm font-semibold text-zinc-900">{c.title}</p>
        <p className="line-clamp-2 text-xs text-zinc-500">{c.caption || c.hook}</p>
      </Link>

      {/* Acciones rápidas */}
      <div className="mt-auto grid grid-cols-2 gap-1.5 pt-1">
        <Button size="sm" variant="outline" onClick={() => router.push(`/content/${c.id}`)}>
          <Eye className="h-3.5 w-3.5" /> Ver
        </Button>
        <Button size="sm" variant="outline" onClick={() => router.push(`/content/${c.id}#modificar-contenido`)}>
          <Wand2 className="h-3.5 w-3.5" /> Modificar
        </Button>
        <Button
          size="sm"
          variant={approved ? "outline" : "lima"}
          onClick={() => {
            updateContent(c.id, { status: approved ? "generado" : "aprobado" });
            onToast(approved ? "Marcado como pendiente" : "Aprobado ✓");
          }}
        >
          <Check className="h-3.5 w-3.5" /> {approved ? "Aprobado" : "Aprobar"}
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
    </Card>
  );
}
