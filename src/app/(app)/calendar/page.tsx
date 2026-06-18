"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore, useFlow } from "@/lib/store";
import { exportCalendarCsv } from "@/lib/exports";
import { Button, EmptyState, PageHeader, Select } from "@/components/ui";
import { PlatformLogo } from "@/components/platform-logo";
import { ProgressTracker, buildFlowSteps } from "@/components/flow";
import { CalendarDays, Download, Lock, Clock } from "lucide-react";
import { CHANNELS, CONTENT_FORMATS } from "@/lib/constants";
import { bucketOf } from "@/lib/content-status";
import type { ContentItem } from "@/lib/types";

export default function CalendarPage() {
  const router = useRouter();
  const business = useStore((s) => s.businesses.find((b) => b.id === s.activeBusinessId) || null);
  const allContents = useStore((s) => s.contents);
  const calendars = useStore((s) => s.calendars);
  const flow = useFlow(business?.id);

  const [fChannel, setFChannel] = useState("");
  const [fFormat, setFFormat] = useState("");

  const strategyApproved = flow.strategy === "approved";

  const dateById = useMemo(() => {
    const m = new Map<string, string>();
    if (business) (calendars[business.id] || []).forEach((it) => m.set(it.id, it.date));
    return m;
  }, [calendars, business]);

  const dateOf = (c: ContentItem) =>
    c.scheduledDate || (c.calendarItemId ? dateById.get(c.calendarItemId) : undefined) || c.createdAt.slice(0, 10);

  // Solo contenidos aprobados / programados / publicados (no los que están en revisión).
  const scheduled = useMemo(() => {
    if (!business) return [];
    return allContents
      .filter((c) => c.businessId === business.id && bucketOf(c, dateOf(c)) !== "revision")
      .filter((c) => (!fChannel || c.channel === fChannel) && (!fFormat || c.format === fFormat))
      .sort((a, b) => dateOf(a).localeCompare(dateOf(b)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allContents, business, fChannel, fFormat, dateById]);

  if (!business) return null;

  if (!strategyApproved) {
    return (
      <div className="space-y-5">
        <ProgressTracker steps={buildFlowSteps(flow, true)} />
        <EmptyState
          icon={Lock}
          title="Primero aprobá la estrategia"
          description="Cuando apruebes tus contenidos, los vas a ver organizados acá."
        >
          <Link href="/strategy">
            <Button>Ir a la estrategia</Button>
          </Link>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ProgressTracker steps={buildFlowSteps(flow, true)} />

      <PageHeader title="Tu calendario" subtitle="Este calendario muestra únicamente contenidos aprobados o programados.">
        {scheduled.length > 0 && (
          <Button variant="outline" onClick={() => exportCalendarCsv(business, calendars[business.id] || [])}>
            <Download className="h-4 w-4" /> CSV
          </Button>
        )}
      </PageHeader>

      {scheduled.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Todavía no hay contenidos aprobados"
          description="Aprobá tus contenidos y van a aparecer acá, organizados por fecha."
        >
          <Link href="/content">
            <Button>Ir a revisar contenidos</Button>
          </Link>
        </EmptyState>
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Select value={fChannel} onChange={(e) => setFChannel(e.target.value)} className="w-full sm:w-48">
              <option value="">Todos los canales</option>
              {CHANNELS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
            <Select value={fFormat} onChange={(e) => setFFormat(e.target.value)} className="w-full sm:w-52">
              <option value="">Todos los formatos</option>
              {CONTENT_FORMATS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </Select>
          </div>

          <ContentMonthView items={scheduled} dateOf={dateOf} onItemClick={(c) => router.push(`/content/${c.id}`)} />
        </>
      )}
    </div>
  );
}

// ── Vista mensual de contenidos ──────────────────────────────
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function ContentMonthView({
  items,
  dateOf,
  onItemClick,
}: {
  items: ContentItem[];
  dateOf: (c: ContentItem) => string;
  onItemClick: (c: ContentItem) => void;
}) {
  const byMonth: Record<string, ContentItem[]> = {};
  for (const it of items) {
    const key = dateOf(it).slice(0, 7);
    (byMonth[key] ||= []).push(it);
  }
  const monthKeys = Object.keys(byMonth).sort();

  return (
    <div className="space-y-6">
      {monthKeys.map((mk) => {
        const [y, m] = mk.split("-").map(Number);
        const first = new Date(y, m - 1, 1);
        const daysInMonth = new Date(y, m, 0).getDate();
        const startOffset = (first.getDay() + 6) % 7;
        const cells: (number | null)[] = [
          ...Array(startOffset).fill(null),
          ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
        ];
        const itemsByDay: Record<number, ContentItem[]> = {};
        for (const it of byMonth[mk]) {
          const day = Number(dateOf(it).slice(8, 10));
          (itemsByDay[day] ||= []).push(it);
        }

        const today = new Date();
        const isCurrentMonth = today.getFullYear() === y && today.getMonth() === m - 1;
        const todayDate = today.getDate();

        return (
          <div key={mk}>
            <h3 className="mb-3 text-lg font-bold capitalize text-zinc-800">{MONTHS[m - 1]} <span className="text-zinc-400">{y}</span></h3>

            {/* Grilla (desktop) */}
            <div className="hidden rounded-3xl border border-zinc-200/70 bg-white p-3 shadow-card sm:block">
              <div className="grid grid-cols-7 gap-1.5">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="py-1.5 text-center text-[11px] font-bold uppercase tracking-wide text-zinc-400">{d}</div>
                ))}
                {cells.map((day, i) => {
                  const isToday = isCurrentMonth && day === todayDate;
                  const dayItems = day ? itemsByDay[day] || [] : [];
                  return (
                    <div
                      key={i}
                      className={`min-h-[104px] rounded-2xl border p-1.5 transition ${
                        day ? "border-zinc-100 hover:border-zinc-200" : "border-transparent bg-zinc-50/40"
                      } ${isToday ? "border-loca-200 bg-loca-50/40 ring-1 ring-loca-100" : ""}`}
                    >
                      {day && (
                        <>
                          <div className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${isToday ? "bg-loca-600 text-white" : "text-zinc-400"}`}>{day}</div>
                          <div className="space-y-1">
                            {dayItems.map((c) => (
                              <button
                                key={c.id}
                                onClick={() => onItemClick(c)}
                                className="flex w-full items-center gap-1.5 rounded-lg bg-zinc-50 px-1.5 py-1 text-left transition hover:bg-loca-50 hover:ring-1 hover:ring-loca-100"
                                title={`${c.channel} · ${c.title}`}
                              >
                                <PlatformLogo channel={c.channel} size={18} className="shrink-0 !rounded-md" />
                                <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-zinc-600">{c.title}</span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Agenda (mobile) */}
            <div className="space-y-2.5 sm:hidden">
              {Object.keys(itemsByDay)
                .map(Number)
                .sort((a, b) => a - b)
                .map((day) => (
                  <div key={day} className="rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-card">
                    <p className="mb-2.5 text-sm font-bold text-zinc-700">{day} de {MONTHS[m - 1]}</p>
                    <div className="space-y-2">
                      {itemsByDay[day].map((c) => (
                        <button
                          key={c.id}
                          onClick={() => onItemClick(c)}
                          className="flex w-full items-center gap-3 rounded-xl bg-zinc-50 px-3 py-2.5 text-left transition hover:bg-loca-50"
                        >
                          <PlatformLogo channel={c.channel} size={32} className="shrink-0" />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-700">{c.title}</span>
                          {c.scheduledTime && (
                            <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-zinc-400">
                              <Clock className="h-3 w-3" /> {c.scheduledTime}
                            </span>
                          )}
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
