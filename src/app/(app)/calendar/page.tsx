"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore, useFlow } from "@/lib/store";
import { exportCalendarCsv } from "@/lib/exports";
import { Badge, Button, EmptyState, PageHeader, Select } from "@/components/ui";
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

        return (
          <div key={mk}>
            <h3 className="mb-2 font-semibold capitalize text-zinc-800">{MONTHS[m - 1]} {y}</h3>

            {/* Grilla (desktop) */}
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
                          {(itemsByDay[day] || []).map((c) => (
                            <button
                              key={c.id}
                              onClick={() => onItemClick(c)}
                              className="block w-full truncate rounded-md bg-emerald-50 px-1.5 py-1 text-left text-[11px] text-emerald-700 hover:bg-emerald-100"
                              title={`${c.channel} · ${c.title}`}
                            >
                              <span className="font-semibold">{c.channel.slice(0, 2)}</span> {c.title}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Agenda (mobile) */}
            <div className="space-y-2 sm:hidden">
              {Object.keys(itemsByDay)
                .map(Number)
                .sort((a, b) => a - b)
                .map((day) => (
                  <div key={day} className="rounded-xl border border-zinc-200 bg-white p-3">
                    <p className="mb-1.5 text-sm font-semibold text-zinc-700">{day} de {MONTHS[m - 1]}</p>
                    <div className="space-y-1.5">
                      {itemsByDay[day].map((c) => (
                        <button
                          key={c.id}
                          onClick={() => onItemClick(c)}
                          className="flex w-full items-center gap-2 rounded-lg bg-zinc-50 px-2 py-1.5 text-left text-sm hover:bg-emerald-50"
                        >
                          <Badge tone="pink">{c.channel}</Badge>
                          <span className="min-w-0 flex-1 truncate text-zinc-700">{c.title}</span>
                          {c.scheduledTime && (
                            <span className="flex shrink-0 items-center gap-0.5 text-xs text-zinc-400">
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
