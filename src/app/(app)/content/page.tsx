"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useStore, useFlow } from "@/lib/store";
import { useGenerators } from "@/lib/generators";
import { exportContentsCsv } from "@/lib/exports";
import { Badge, Button, Card, EvaLoading, Select, useToast } from "@/components/ui";
import { ContentPreview } from "@/components/content-preview";
import { ProgressTracker, buildFlowSteps } from "@/components/flow";
import { CHANNELS, CONTENT_FORMATS, FORMAT_LABELS, CONTENT_STATUS_LABELS } from "@/lib/constants";
import { Download, FileText, Lock, Sparkles } from "lucide-react";

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
      show(n > 0 ? "Contenidos generados 🎉" : "Ya están todos generados");
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

  // Gate: calendario no aprobado
  if (!calendarApproved) {
    return (
      <div className="space-y-5">
        {node}
        <ProgressTracker steps={buildFlowSteps(flow, true)} />
        <Card className="mx-auto max-w-md text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
            <Lock className="h-5 w-5 text-zinc-400" />
          </div>
          <h2 className="mt-3 font-semibold">Primero aprobá el calendario</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Así Eva genera los contenidos en orden y con coherencia.
          </p>
          <Link href="/calendar">
            <Button className="mt-4">Ir al calendario</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {node}
      <ProgressTracker steps={buildFlowSteps(flow, true)} />

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Estudio de contenidos</h1>
          <p className="text-sm text-zinc-500">{contents.length} piezas para {business.name}.</p>
        </div>
        {contents.length > 0 && (
          <Button variant="outline" onClick={() => exportContentsCsv(business, filtered)}>
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
        )}
      </div>

      {loading && contents.length === 0 && <EvaLoading text="Eva está creando tus contenidos…" />}
      {progress && <p className="text-sm font-medium text-loca-600">{progress}</p>}

      {contents.length === 0 && !loading ? (
        <Card className="text-center">
          <FileText className="mx-auto h-8 w-8 text-loca-500" />
          <h2 className="mt-3 font-semibold">Generá los contenidos del mes</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Eva crea el texto de cada publicación de tu calendario.
          </p>
          <Button className="mt-4" onClick={generateAll} loading={loading}>
            <Sparkles className="h-4 w-4" /> Generar contenidos del mes
          </Button>
        </Card>
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
              <Link key={c.id} href={`/content/${c.id}`}>
                <Card className="flex h-full flex-col gap-3 p-3 transition hover:border-loca-300">
                  <ContentPreview content={c} business={business} className="!shadow-none" />
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="pink">{c.channel}</Badge>
                    <Badge>{FORMAT_LABELS[c.format]}</Badge>
                    <Badge tone={STATUS_TONE[c.status]}>{CONTENT_STATUS_LABELS[c.status]}</Badge>
                  </div>
                  <p className="line-clamp-2 text-sm font-medium text-zinc-800">{c.title}</p>
                  <p className="line-clamp-2 text-xs text-zinc-500">{c.hook}</p>
                </Card>
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
