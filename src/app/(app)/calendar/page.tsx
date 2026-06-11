"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore, useFlow } from "@/lib/store";
import { useGenerators } from "@/lib/generators";
import { exportCalendarCsv } from "@/lib/exports";
import { Badge, Button, Card, EmptyState, EvaLoading, Modal, PageHeader, Select, useToast } from "@/components/ui";
import { ApprovalActions, FeedbackPanel, ProgressTracker, StickyApproveBar, buildFlowSteps } from "@/components/flow";
import { CALENDAR_FEEDBACK, applyStructuredFeedback } from "@/lib/feedback";
import { CalendarDays, Download, FileText, Lock, Sparkles, List as ListIcon, Grid3x3 } from "lucide-react";
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
  const [view, setView] = useState<"lista" | "calendario">("lista");
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
        <EmptyState
          icon={Lock}
          title="Primero aprobá la estrategia"
          description="Para armar un calendario coherente, Eva necesita tu estrategia aprobada."
        >
          <Link href="/strategy">
            <Button>Ir a la estrategia</Button>
          </Link>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className={calendar.length > 0 ? "space-y-5 pb-24" : "space-y-5"}>
      {node}
      <ProgressTracker steps={buildFlowSteps(flow, true)} />

      <PageHeader title="Tu calendario" subtitle={`Las publicaciones del mes para ${business.name}.`}>
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
      </PageHeader>

      {loading && !calendar.length && <EvaLoading text="Eva está armando tu calendario…" />}

      {!calendar.length && !loading && (
        <EmptyState
          icon={CalendarDays}
          title="Generá tu primer mes"
          description="Eva distribuye las publicaciones por vos."
        >
          <Button onClick={() => generate()} loading={loading}>
            <Sparkles className="h-4 w-4" /> Generar calendario
          </Button>
        </EmptyState>
      )}

      {calendar.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
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
            {/* Toggle Lista / Calendario */}
            <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-1">
              {(["lista", "calendario"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    view === v ? "bg-loca-600 text-white shadow-sm" : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  {v === "lista" ? <ListIcon className="h-4 w-4" /> : <Grid3x3 className="h-4 w-4" />}
                  {v === "lista" ? "Lista" : "Calendario"}
                </button>
              ))}
            </div>
          </div>

          {view === "calendario" ? (
            <CalendarMonthView
              items={filtered}
              contentByItem={contentByItem}
              onItemClick={genContent}
            />
          ) : (
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
          )}
        </>
      )}

      {/* Barra sticky de aprobación */}
      {calendar.length > 0 && (
        <StickyApproveBar>
          <ApprovalActions
            approved={approved}
            onApprove={approve}
            onModify={() => setShowFeedback(true)}
            approveLabel="Aprobar calendario"
            approvedLabel="Calendario aprobado"
            modifyLabel="Modificar"
            nextLabel="Ver contenidos →"
            onNext={() => router.push("/content?generate=1")}
          />
        </StickyApproveBar>
      )}

      {/* Modificar calendario (modal) */}
      <Modal open={showFeedback} onClose={() => setShowFeedback(false)} title="Modificar calendario">
        <FeedbackPanel
          title="¿Qué querés cambiar?"
          options={CALENDAR_FEEDBACK}
          onApply={applyFeedback}
          onCancel={() => setShowFeedback(false)}
          loading={loading}
        />
      </Modal>
    </div>
  );
}

// ── Vista calendario (grilla mensual en desktop, agenda en mobile) ──
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function CalendarMonthView({
  items,
  contentByItem,
  onItemClick,
}: {
  items: CalendarItem[];
  contentByItem: Map<string | undefined, any>;
  onItemClick: (it: CalendarItem) => void;
}) {
  // Agrupar por mes (yyyy-mm)
  const byMonth: Record<string, CalendarItem[]> = {};
  for (const it of items) {
    const key = it.date.slice(0, 7);
    (byMonth[key] ||= []).push(it);
  }
  const monthKeys = Object.keys(byMonth).sort();

  return (
    <div className="space-y-6">
      {monthKeys.map((mk) => {
        const [y, m] = mk.split("-").map(Number);
        const first = new Date(y, m - 1, 1);
        const daysInMonth = new Date(y, m, 0).getDate();
        const startOffset = (first.getDay() + 6) % 7; // lunes primero
        const cells: (number | null)[] = [
          ...Array(startOffset).fill(null),
          ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
        ];
        const itemsByDay: Record<number, CalendarItem[]> = {};
        for (const it of byMonth[mk]) {
          const d = Number(it.date.slice(8, 10));
          (itemsByDay[d] ||= []).push(it);
        }

        return (
          <div key={mk}>
            <h3 className="mb-2 font-semibold capitalize text-zinc-800">
              {MONTHS[m - 1]} {y}
            </h3>

            {/* Grilla mensual (desktop) */}
            <div className="hidden rounded-2xl border border-zinc-200 bg-white p-2 sm:block">
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="py-1 text-center text-xs font-medium text-zinc-400">{d}</div>
                ))}
                {cells.map((day, i) => (
                  <div key={i} className="min-h-[88px] rounded-lg border border-zinc-100 p-1">
                    {day && (
                      <>
                        <div className="mb-1 text-xs font-medium text-zinc-400">{day}</div>
                        <div className="space-y-1">
                          {(itemsByDay[day] || []).map((it) => (
                            <button
                              key={it.id}
                              onClick={() => onItemClick(it)}
                              className="block w-full truncate rounded-md bg-loca-50 px-1.5 py-1 text-left text-[11px] text-loca-700 hover:bg-loca-100"
                              title={`${it.channel} · ${it.topic}`}
                            >
                              <span className="font-semibold">{it.channel.slice(0, 2)}</span> {it.topic}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Agenda por día (mobile) */}
            <div className="space-y-2 sm:hidden">
              {Object.keys(itemsByDay)
                .map(Number)
                .sort((a, b) => a - b)
                .map((day) => (
                  <div key={day} className="rounded-xl border border-zinc-200 bg-white p-3">
                    <p className="mb-1.5 text-sm font-semibold text-zinc-700">{day} de {MONTHS[m - 1]}</p>
                    <div className="space-y-1.5">
                      {itemsByDay[day].map((it) => (
                        <button
                          key={it.id}
                          onClick={() => onItemClick(it)}
                          className="flex w-full items-center gap-2 rounded-lg bg-zinc-50 px-2 py-1.5 text-left text-sm hover:bg-loca-50"
                        >
                          <Badge tone="pink">{it.channel}</Badge>
                          <span className="min-w-0 flex-1 truncate text-zinc-700">{it.topic}</span>
                          {contentByItem.get(it.id) && <FileText className="h-3.5 w-3.5 shrink-0 text-loca-500" />}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
