"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";

// Mensajes rotativos según la fase de generación. Ver PLAN-v2 item 22.
const MESSAGES: Record<string, string[]> = {
  contenido: [
    "Estoy escribiendo los textos…",
    "Estoy afinando los copies…",
    "Estoy pensando cada concepto…",
  ],
  imagen: [
    "Estoy buscando referencias…",
    "Estoy diseñando las imágenes…",
    "Estoy corrigiendo detalles…",
    "Me está gustando cómo queda…",
  ],
  default: ["Estoy trabajando en tus contenidos…", "Ya falta menos…"],
};

/**
 * Popup sutil, siempre visible mientras Eva genera: barra de progreso +
 * mensajes que van rotando + botón (inactivo por ahora) de aviso por email.
 */
export function GenerationProgress({
  done,
  total,
  phase = "default",
  onEmailClick,
}: {
  done?: number;
  total?: number;
  phase?: string;
  onEmailClick?: () => void;
}) {
  const msgs = MESSAGES[phase] || MESSAGES.default;
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % msgs.length), 2500);
    return () => clearInterval(id);
  }, [msgs.length]);

  const hasCount = typeof done === "number" && typeof total === "number" && total > 0;
  const pct = hasCount ? Math.round((done! / total!) * 100) : null;

  return (
    <div className="fixed bottom-4 right-4 z-40 w-72 rounded-2xl border border-border bg-card/95 p-4 shadow-lift backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 animate-pulse rounded-full bg-loca-500" />
        <p className="text-sm font-bold text-foreground">Eva está trabajando</p>
        {hasCount && <span className="ml-auto text-xs font-semibold text-faint">{done}/{total}</span>}
      </div>
      <p key={i} className="mt-1.5 text-xs text-muted-foreground">{msgs[i]}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted">
        <div
          className={`h-full rounded-full bg-gradient-to-r from-loca-500 to-lima-400 ${pct == null ? "animate-pulse" : "transition-all duration-500"}`}
          style={{ width: pct == null ? "40%" : `${pct}%` }}
        />
      </div>
      <button
        onClick={onEmailClick}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border px-2 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-surface-subtle"
      >
        <Mail className="h-3.5 w-3.5" /> Avisame por email cuando termine
      </button>
    </div>
  );
}
