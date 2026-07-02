"use client";

import Link from "next/link";
import { useStore, useFlow } from "@/lib/store";
import { isStrategyGenerating } from "@/lib/strategy-job";
import { Badge, Button, Card, SectionLabel } from "@/components/ui";
import { AiStatusBadge } from "@/components/ai-status";
import { EvaAvatar } from "@/components/brand";
import { ProgressTracker, buildFlowSteps } from "@/components/flow";
import {
  Sparkles,
  CalendarDays,
  FileText,
  Megaphone,
  ArrowRight,
} from "lucide-react";

export default function DashboardPage() {
  const business = useStore((s) => s.businesses.find((b) => b.id === s.activeBusinessId) || null);
  const strategies = useStore((s) => s.strategies);
  const calendars = useStore((s) => s.calendars);
  const contents = useStore((s) => s.contents);
  const flow = useFlow(business?.id);

  if (!business) return null;

  const strategy = strategies[business.id];
  const strategyGenerating = isStrategyGenerating(business.id);
  const calendar = calendars[business.id] || [];
  const bizContents = contents.filter((c) => c.businessId === business.id);
  const approved = bizContents.filter((c) => c.status === "aprobado").length;
  const images = bizContents.filter((c) => c.imageStatus === "generada").length;

  const nextStep = strategyGenerating
    ? {
        title: "Eva está generando tu estrategia",
        desc: "Tarda ~1 minuto. Podés seguir navegando mientras tanto.",
        href: "/strategy",
        cta: "Ver progreso",
      }
    : flow.strategy !== "approved"
      ? {
          title: strategy ? "Revisá y aprobá tu estrategia" : "Generá tu estrategia",
          desc: "Es el primer paso. Eva la arma a partir de tu negocio.",
          href: "/strategy",
          cta: strategy ? "Revisar estrategia" : "Generar estrategia",
        }
      : bizContents.length === 0
        ? {
            title: "Generá los contenidos del mes",
            desc: "Eva crea piezas completas con fecha, copy e imagen, listas para aprobar.",
            href: "/content?generate=1",
            cta: "Generar contenidos",
          }
        : flow.content !== "approved"
          ? {
              title: "Revisá y aprobá tus contenidos",
              desc: "Aprobá cada pieza. Las aprobadas pasan al calendario.",
              href: "/content",
              cta: "Revisar contenidos",
            }
          : {
              title: "¡Tu marketing está listo! 🎉",
              desc: "Tus contenidos aprobados ya están en el calendario. Revisá o exportá cuando quieras.",
              href: "/calendar",
              cta: "Ver calendario",
            };

  const hasWork = bizContents.length > 0 || calendar.length > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <EvaAvatar size={56} />
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">{business.name}</h1>
            <p className="mt-1 text-[15px] text-zinc-500">
              {business.industry} · {business.city || business.country}
            </p>
          </div>
        </div>
        <AiStatusBadge />
      </div>

      {/* Próximo paso — protagonista */}
      <Card className="loca-soft-bg overflow-hidden p-7 shadow-glow sm:p-9">
        <SectionLabel>Tu próximo paso</SectionLabel>
        <div className="mt-3 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">{nextStep.title}</h2>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-zinc-600">{nextStep.desc}</p>
          </div>
          <Link href={nextStep.href} className="w-full shrink-0 sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto">
              {nextStep.cta} <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </Card>

      {/* Progreso del flujo */}
      <Card className="p-7">
        <SectionLabel>Tu progreso</SectionLabel>
        <div className="mt-4">
          <ProgressTracker steps={buildFlowSteps(flow, true)} />
        </div>
      </Card>

      {/* Resumen liviano (solo si ya hay trabajo) */}
      {hasWork && (
        <div className="grid grid-cols-3 gap-4">
          <MiniStat label="Publicaciones" value={calendar.length} icon={CalendarDays} />
          <MiniStat label="Contenidos" value={bizContents.length} icon={FileText} />
          <MiniStat label="Aprobados" value={approved} icon={Sparkles} />
        </div>
      )}

      {/* Accesos */}
      <div>
        <SectionLabel>Accesos rápidos</SectionLabel>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <AccessCard href="/strategy" title="Estrategia" desc="Tu plan de marketing." icon={Sparkles} />
          <AccessCard href="/calendar" title="Calendario" desc="Publicaciones del mes." icon={CalendarDays} />
          <AccessCard href="/content" title="Contenidos" desc="Editá, aprobá y exportá." icon={FileText} />
          <AccessCard href="/ads" title="Ads" desc="Estrategia de Meta y Google." icon={Megaphone} />
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: any; icon: any }) {
  return (
    <Card className="flex flex-col gap-2 p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-loca-50">
        <Icon className="h-4 w-4 text-loca-500" />
      </div>
      <div className="text-3xl font-bold tracking-tight text-zinc-900">{value}</div>
      <div className="text-xs font-medium text-zinc-500">{label}</div>
    </Card>
  );
}

function AccessCard({ href, title, desc, icon: Icon }: { href: string; title: string; desc: string; icon: any }) {
  return (
    <Link href={href}>
      <Card className="group flex items-center justify-between p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 transition group-hover:bg-loca-50">
            <Icon className="h-5 w-5 text-zinc-500 transition group-hover:text-loca-600" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-zinc-900">{title}</h3>
            <p className="text-sm text-zinc-500">{desc}</p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-loca-600" />
      </Card>
    </Link>
  );
}
