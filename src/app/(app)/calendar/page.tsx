"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore, useFlow } from "@/lib/store";
import { useGenerators } from "@/lib/generators";
import { exportCalendarCsv } from "@/lib/exports";
import { Badge, Button, Card, EvaLoading, Select, useToast } from "@/components/ui";
import { ApprovalActions, FeedbackPanel, ProgressTracker, buildFlowSteps } from "@/components/flow";
import { CALENDAR_FEEDBACK, applyStructuredFeedback } from "@/lib/feedback";
import { CalendarDays, Download, FileText, Lock, Sparkles } from "lucide-react";
import { FORMAT_LABELS, CHANNELS, CONTENT_FORMATS } from "@/lib/constants";
import { formatDateShort, weekdayEs } from "@/lib/utils";
import type { CalendarItem } from "@/lib/types";

export default function CalendarPage() {
  const router = useRouter();
  const params = useSearchParams();
  const business = useStore((s) => s.businesses.find((b) => b.id === s.activeBusinessId) || null);
  const calendar = useStore((s) => (business ? s.calendars[business.id] || [] : []));
  const contents = useStore((s) => s.contents);
  const updateItem = useStore((s) => s.updateCalendarItem);
  const setFlow = useStore((s) => s.setFlow);
  const flow = useFlow(business?.id);
  const gen = useGenerators();
  const { show, node } = useToast();

  const [count, setCount] = useState(16);
  const [loading, setLoading] = useState(false);
  const [genItemId, setGenItemId] = useState<string | null>(null);
  const [fChannel, setFChannel] = useState("");
  const [fFormat, setFFormat] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const autoTriggered = useRef(false);

  const filtered = useMemo(
    () =>
      [...calendar]
        .sort((a, b) => a.date.localeCompare(b.date))
        .filter((it) => (!fChannel || it.channel === fChannel) && (!fFormat || it.format === fFormat)),
    [calendar, fChannel, fFormat]
  );

  const strategyApproved = flow.strategy === "approved";
  const approved = flow.calendar === "approved";

  useEffect(() => {
    if (!business || autoTriggered.current) return;
    if (params.get("generate") === "1" && strategyApproved && calendar.length === 0) {
      autoTriggered.current = true;
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business, strategyApproved, calendar.length, params]);

  useEffect(() => {
    const onEva = (e: Event) => {
      if ((e as CustomEvent).detail?.action === "modificar") setShowFeedback(true);
    };
    window.addEventListener("eva:action", onEva);
    return () => window.removeEventListener("eva:action", onEva);
  }, []);

  if (!business) return null;

  const contentByItem = new Map(
    contents.filter((c) => c.businessId === business.id && c.calendarItemId).map((c) => [c.calendarItemId, c])
  );

  async function generate(feedback?: string) {
    setLoading(true);
    try {
      const meta = await gen.generateCalendar(business!, count, feedback);
      show(meta?.warning || (feedback ? "Calendario actualizado 🗓️" : "Calendario listo 🗓️"));
      setShowFeedback(false);
    } catch (e: any) {
      show(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  function approve() {
    setFlow(business!.id, { calendar: "approved" });
    show("Calendario aprobado 🎉 Ahora Eva genera los contenidos.");
    setTimeout(() => router.push("/content?generate=1"), 600);
  }

  function applyFeedback(values: string[], custom: string) {
    generate(applyStructuredFeedback(CALENDAR_FEEDBACK, values, custom));
  }

  async function genContent(item: CalendarItem) {
    const existing = contentByItem.get(item.id);
    if (existing) {
      router.push(`/content/${existing.id}`);
      return;
    }
    setGenItemId(item.id);
    try {
      const c = await gen.generateContentForItem(business!, item);
      router.push(`/content/${c.id}`);
    } catch (e: any) {
      show(e?.message || "Error");
    } finally {
      setGenItemId(null);
    }
  }

  // Gate: estrategia no aprobada
  if (!strategyApproved) {
    return (
      <div className="space-y-5">
        {node}
        <ProgressTracker steps={buildFlowSteps(flow, true)} />
        <Card className="mx-auto max-w-md text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
            <Lock className="h-5 w-5 text-zinc-400" />
          </div>
          <h2 className="mt-3 font-semibold">Primero aprobá la estrategia</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Para que Eva pueda armar un calendario coherente, necesitamos tu estrategia aprobada.
          </p>
          <Link href="/strategy">
            <Button className="mt-4">Ir a la estrategia</Button>
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
          <h1 className="text-2xl font-bold">Tu calendario</h1>
          <p className="text-sm text-zinc-500">Las publicaciones del mes para {business.name}.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={count} onChange={(e) => setCount(Number(e.target.value))} className="h-10 w-28">
            <option value={8}>8 posts</option>
            <option value={16}>16 posts</option>
            <option value={30}>30 posts</option>
          </Select>
          {calendar.length > 0 && (
            <Button variant="outline" onClick={() => exportCalendarCsv(business, calendar)}>
              <Download className="h-4 w-4" /> CSV
            </Button>
          )}
        </div>
      </div>

      {loading && !calendar.length && <EvaLoading text="Eva está armando tu calendario…" />}

      {!calendar.length && !loading && (
        <Card className="text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-loca-500" />
          <h2 className="mt-3 font-semibold">Generá tu primer mes</h2>
          <p className="mt-1 text-sm text-zinc-500">Eva distribuye las publicaciones por vos.</p>
          <Button className="mt-4" onClick={() => generate()} loading={loading}>
            <Sparkles className="h-4 w-4" /> Generar calendario
          </Button>
        </Card>
      )}

      {calendar.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
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
          </div>

          <div className="space-y-2">
            {filtered.map((it) => {
              const content = contentByItem.get(it.id);
              return (
                <Card key={it.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="flex w-full shrink-0 flex-row items-center gap-2 rounded-xl bg-loca-50 px-3 py-2 sm:w-16 sm:flex-col sm:gap-0 sm:py-2">
                    <span className="text-xs uppercase text-loca-500">{weekdayEs(it.date)}</span>
                    <span className="text-lg font-bold text-loca-700">{formatDateShort(it.date)}</span>
                    <span className="text-xs text-zinc-400">{it.suggestedTime}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="pink">{it.channel}</Badge>
                      <Badge>{FORMAT_LABELS[it.format]}</Badge>
                      <span className="text-xs text-zinc-400">{it.contentPillar}</span>
                    </div>
                    <p className="mt-1 font-medium text-zinc-800">{it.topic}</p>
                    <p className="text-xs text-zinc-400">Objetivo: {it.objective}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {content ? (
                      <Button size="sm" variant="outline" onClick={() => genContent(it)}>
                        <FileText className="h-4 w-4" /> Ver pieza
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant={approved ? "primary" : "outline"}
                        disabled={!approved}
                        loading={genItemId === it.id}
                        onClick={() => genContent(it)}
                        title={approved ? "" : "Aprobá el calendario para generar contenidos"}
                      >
                        <FileText className="h-4 w-4" /> Generar
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Aprobar / Modificar */}
          {!showFeedback ? (
            <Card className="space-y-3">
              <p className="text-sm text-zinc-500">
                {approved
                  ? "Calendario aprobado. Ya podés generar los contenidos del mes."
                  : "¿Te sirve este calendario? Aprobalo y Eva genera los contenidos. Si querés, pedile ajustes."}
              </p>
              <ApprovalActions
                approved={approved}
                onApprove={approve}
                onModify={() => setShowFeedback(true)}
                approveLabel="Aprobar calendario"
                modifyLabel="Modificar calendario"
              />
            </Card>
          ) : (
            <FeedbackPanel
              title="¿Qué querés cambiar del calendario?"
              options={CALENDAR_FEEDBACK}
              onApply={applyFeedback}
              onCancel={() => setShowFeedback(false)}
              loading={loading}
            />
          )}
        </>
      )}
    </div>
  );
}
