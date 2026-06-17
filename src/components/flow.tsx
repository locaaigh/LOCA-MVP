"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button, Card } from "@/components/ui";
import type { FeedbackOption } from "@/lib/feedback";
import { Check, Circle, Loader2, ThumbsUp, Wand2, Pencil, MessageSquarePlus } from "lucide-react";

export type StepStatus = "pendiente" | "en_progreso" | "aprobado";

export interface FlowStep {
  key: string;
  label: string;
  href?: string;
  status: StepStatus;
}

import type { ApprovalStatus } from "@/lib/types";
import type { FlowState } from "@/lib/store";

function toStepStatus(s: ApprovalStatus): StepStatus {
  if (s === "approved") return "aprobado";
  if (s === "pending_review" || s === "needs_changes") return "en_progreso";
  return "pendiente";
}

// Flujo nuevo: Formulario → Estrategia → Contenidos → Calendario → Exportar.
// El calendario se "aprueba" solo cuando los contenidos están aprobados.
export function buildFlowSteps(flow: FlowState, hasBusiness: boolean): FlowStep[] {
  return [
    { key: "form", label: "Formulario", href: "/onboarding", status: hasBusiness ? "aprobado" : "pendiente" },
    { key: "strategy", label: "Estrategia", href: "/strategy", status: toStepStatus(flow.strategy) },
    { key: "content", label: "Contenidos", href: "/content", status: toStepStatus(flow.content) },
    {
      key: "calendar",
      label: "Calendario",
      href: "/calendar",
      status: flow.content === "approved" ? "aprobado" : "pendiente",
    },
    {
      key: "export",
      label: "Exportar",
      status: flow.content === "approved" ? "aprobado" : "pendiente",
    },
  ];
}

// ── Progress tracker del flujo ───────────────────────────────
export function ProgressTracker({ steps }: { steps: FlowStep[] }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {steps.map((s, i) => {
        const dot =
          s.status === "aprobado" ? (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-lima-400 text-ink">
              <Check className="h-4 w-4" />
            </span>
          ) : s.status === "en_progreso" ? (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-loca-600 text-white">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            </span>
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 text-zinc-500">
              <Circle className="h-3 w-3" />
            </span>
          );
        const labelEl = (
          <span
            className={cn(
              "whitespace-nowrap text-xs font-medium",
              s.status === "aprobado"
                ? "text-lima-700"
                : s.status === "en_progreso"
                  ? "text-loca-700"
                  : "text-zinc-400"
            )}
          >
            {s.label}
          </span>
        );
        return (
          <React.Fragment key={s.key}>
            <div className="flex shrink-0 items-center gap-1.5">
              {dot}
              {s.href ? (
                <Link href={s.href} className="hover:underline">
                  {labelEl}
                </Link>
              ) : (
                labelEl
              )}
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-5 shrink-0 rounded-full sm:w-8",
                  s.status === "aprobado" ? "bg-lima-400" : "bg-zinc-200"
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Aprobar / Modificar ──────────────────────────────────────
// Jerarquía: aprobar = verde, grande, protagonista. Modificar = secundario,
// chico, ghost, con ícono de lápiz. El camino natural es aprobar.
export function ApprovalActions({
  onApprove,
  onModify,
  approved,
  approveLabel,
  approvedLabel = "Aprobado",
  modifyLabel,
  approveLoading,
  nextLabel,
  onNext,
}: {
  onApprove: () => void;
  onModify: () => void;
  approved?: boolean;
  approveLabel: string;
  approvedLabel?: string;
  modifyLabel: string;
  approveLoading?: boolean;
  nextLabel?: string;
  onNext?: () => void;
}) {
  if (approved) {
    return (
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100">
          <Check className="h-4 w-4" /> {approvedLabel}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onModify}>
            <Pencil className="h-3.5 w-3.5" /> {modifyLabel}
          </Button>
          {nextLabel && onNext && (
            <Button variant="primary" size="lg" onClick={onNext}>
              {nextLabel}
            </Button>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Button variant="success" size="lg" className="flex-1" onClick={onApprove} loading={approveLoading}>
        {!approveLoading && <ThumbsUp className="h-4 w-4" />}
        {approveLabel}
      </Button>
      <Button variant="ghost" size="md" onClick={onModify}>
        <Pencil className="h-4 w-4" /> {modifyLabel}
      </Button>
    </div>
  );
}

// ── Barra sticky de aprobación (mobile-first, offset del sidebar) ─
export function StickyApproveBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/90 backdrop-blur md:left-64">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-8">{children}</div>
    </div>
  );
}

// ── Panel de feedback seleccionable ──────────────────────────
export function FeedbackPanel({
  title = "¿Qué querés cambiar?",
  options,
  onApply,
  onCancel,
  loading,
}: {
  title?: string;
  options: FeedbackOption[];
  onApply: (selectedValues: string[], custom: string) => void;
  onCancel?: () => void;
  loading?: boolean;
}) {
  const [selected, setSelected] = React.useState<string[]>([]);
  const [showCustom, setShowCustom] = React.useState(false);
  const [custom, setCustom] = React.useState("");

  const toggle = (v: string) =>
    setSelected((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));

  const canApply = selected.length > 0 || custom.trim().length > 0;

  return (
    <Card className="space-y-4 border-loca-200">
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-xs text-zinc-500">
          Elegí una o varias opciones. Eva aplica los cambios por vos.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition",
              selected.includes(o.value)
                ? "border-loca-500 bg-loca-50 text-loca-700"
                : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
            )}
          >
            {o.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowCustom((s) => !s)}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition",
            showCustom
              ? "border-loca-500 bg-loca-50 text-loca-700"
              : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
          )}
        >
          <MessageSquarePlus className="h-3.5 w-3.5" /> Dar feedback personalizado
        </button>
      </div>
      {showCustom && (
        <textarea
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Contale a Eva con tus palabras qué querés cambiar…"
          className="loca-input min-h-[80px]"
        />
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          className="flex-1"
          disabled={!canApply}
          loading={loading}
          onClick={() => onApply(selected, custom)}
        >
          {!loading && <Wand2 className="h-4 w-4" />} Aplicar cambios con Eva
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </Card>
  );
}
