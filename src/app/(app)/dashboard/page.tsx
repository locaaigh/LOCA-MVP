"use client";

import Link from "next/link";
import { useStore, useFlow } from "@/lib/store";
import { Badge, Button, Card, useToast } from "@/components/ui";
import { AiStatusBadge } from "@/components/ai-status";
import { EvaAvatar } from "@/components/brand";
import { ProgressTracker, buildFlowSteps } from "@/components/flow";
import {
  Sparkles,
  CalendarDays,
  FileText,
  ImageIcon,
  CheckCircle2,
  Clock,
  Megaphone,
  ArrowRight,
} from "lucide-react";

export default function DashboardPage() {
  const business = useStore((s) => s.businesses.find((b) => b.id === s.activeBusinessId) || null);
  const strategies = useStore((s) => s.strategies);
  const calendars = useStore((s) => s.calendars);
  const contents = useStore((s) => s.contents);
  const flow = useFlow(business?.id);
  const { node } = useToast();

  if (!business) return null;

  const strategy = strategies[business.id];
  const calendar = calendars[business.id] || [];
  const bizContents = contents.filter((c) => c.businessId === business.id);
  const approved = bizContents.filter((c) => c.status === "aprobado").length;
  const pending = bizContents.filter((c) => c.status === "generado").length;
  const images = bizContents.filter((c) => c.imageStatus === "generada").length;

  // Próximo paso del flujo guiado
  const nextStep =
    flow.strategy !== "approved"
      ? {
          title: strategy ? "Revisá y aprobá tu estrategia" : "Generá tu estrategia",
          desc: "Es el primer paso. Eva la arma a partir de tu negocio.",
          href: "/strategy",
          cta: strategy ? "Revisar estrategia" : "Generar estrategia",
        }
      : flow.calendar !== "approved"
        ? {
            title: calendar.length ? "Revisá y aprobá tu calendario" : "Generá tu calendario",
            desc: "Las publicaciones del mes, listas para aprobar.",
            href: "/calendar",
            cta: calendar.length ? "Revisar calendario" : "Generar calendario",
          }
        : flow.content !== "approved" && bizContents.length === 0
          ? {
              title: "Generá los contenidos del mes",
              desc: "Eva escribe el texto de cada publicación.",
              href: "/content",
              cta: "Generar contenidos",
            }
          : {
              title: "¡Tu marketing está listo! 🎉",
              desc: "Revisá, aprobá y exportá tus piezas cuando quieras.",
              href: "/content",
              cta: "Ir al estudio de contenidos",
            };

  return (
    <div className="space-y-6">
      {node}
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <EvaAvatar size={44} />
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">{business.name}</h1>
            <p className="text-sm text-zinc-500">
              {business.industry} · {business.city || business.country}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AiStatusBadge />
          {business.onboardingComplete ? (
            <Badge tone="green">Formulario completo</Badge>
          ) : (
            <Badge tone="yellow">Formulario incompleto</Badge>
          )}
        </div>
      </div>

      {/* Progreso del flujo */}
      <Card>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Tu progreso</p>
        <ProgressTracker steps={buildFlowSteps(flow, true)} />
      </Card>

      {/* Siguiente paso */}
      <Card className="flex flex-col items-start justify-between gap-4 bg-gradient-to-br from-loca-50 to-white sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-loca-500">Siguiente paso</p>
          <h2 className="mt-0.5 text-lg font-bold text-zinc-900">{nextStep.title}</h2>
          <p className="mt-0.5 text-sm text-zinc-500">{nextStep.desc}</p>
        </div>
        <Link href={nextStep.href} className="shrink-0">
          <Button size="lg">
            {nextStep.cta} <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </Card>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Estrategia" value={strategy ? "Lista" : "—"} icon={Sparkles} />
        <Stat label="Posts creados" value={bizContents.length} icon={FileText} />
        <Stat label="Aprobados" value={approved} icon={CheckCircle2} />
        <Stat label="Pendientes" value={pending} icon={Clock} />
        <Stat label="Imágenes" value={images} icon={ImageIcon} />
        <Stat label="Calendario" value={calendar.length} icon={CalendarDays} />
      </div>

      {/* Accesos */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AccessCard href="/strategy" title="Estrategia" desc="Tu plan de marketing completo." icon={Sparkles} />
        <AccessCard href="/calendar" title="Calendario" desc="Vista mensual de publicaciones." icon={CalendarDays} />
        <AccessCard href="/content" title="Estudio de contenidos" desc="Editá, aprobá y exportá." icon={FileText} />
        <AccessCard href="/ads" title="Ads" desc="Estrategia de Meta y Google." icon={Megaphone} />
      </div>

      {/* Próximo mes preview */}
      {calendar.length > 0 && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Próximas publicaciones</h2>
            <Link href="/calendar" className="text-sm font-medium text-loca-600 hover:underline">
              Ver calendario
            </Link>
          </div>
          <div className="space-y-2">
            {calendar.slice(0, 5).map((it) => (
              <div
                key={it.id}
                className="flex items-center justify-between rounded-lg border border-zinc-100 px-3 py-2 text-sm"
              >
                <span className="font-medium text-zinc-700">{it.topic}</span>
                <span className="flex items-center gap-2 text-xs text-zinc-400">
                  <Badge tone="pink">{it.channel}</Badge>
                  {it.date}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: any; icon: any }) {
  return (
    <Card className="p-4">
      <Icon className="h-4 w-4 text-zinc-400" />
      <div className="mt-2 text-2xl font-bold text-zinc-900">{value}</div>
      <div className="text-xs text-zinc-500">{label}</div>
    </Card>
  );
}

function AccessCard({ href, title, desc, icon: Icon }: { href: string; title: string; desc: string; icon: any }) {
  return (
    <Link href={href}>
      <Card className="group flex items-center justify-between transition hover:border-loca-300">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-zinc-100 p-2.5 group-hover:bg-loca-50">
            <Icon className="h-5 w-5 text-zinc-600 group-hover:text-loca-600" />
          </div>
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-zinc-500">{desc}</p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-zinc-300 group-hover:text-loca-600" />
      </Card>
    </Link>
  );
}
