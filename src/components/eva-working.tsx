"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Mensajes por defecto mientras Eva genera una imagen (item 12).
export const EVA_IMAGE_MESSAGES = [
  "Estoy buscando referencias…",
  "Estoy prompteando…",
  "Estoy diseñando…",
  "Estoy corrigiendo…",
  "Me está gustando…",
];

/**
 * Overlay animado "Eva está trabajando": fondo blurreado en movimiento con
 * mensajes que van rotando. Reemplaza el placeholder genérico "LOCA" mientras
 * se genera una imagen. Reutilizable (preview de contenido, popup de progreso).
 */
export function EvaWorking({
  messages = EVA_IMAGE_MESSAGES,
  brandColor = "#ec4899",
  className,
  intervalMs = 2200,
}: {
  messages?: string[];
  brandColor?: string;
  className?: string;
  intervalMs?: number;
}) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return;
    const id = setInterval(() => setI((v) => (v + 1) % messages.length), intervalMs);
    return () => clearInterval(id);
  }, [messages.length, intervalMs]);

  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)} aria-live="polite">
      {/* Fondo blurreado en movimiento */}
      <div
        className="eva-working-bg absolute inset-0 opacity-80 blur-2xl"
        style={{
          background: `linear-gradient(120deg, ${brandColor}, #a3e635, ${brandColor}, #f472b6)`,
          backgroundSize: "300% 300%",
        }}
      />
      <div className="absolute inset-0 bg-overlay/25" />
      {/* Contenido: spinner + mensaje rotando */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        <p key={i} className="eva-working-msg text-sm font-semibold text-white drop-shadow">
          {messages[i]}
        </p>
      </div>
      <style>{`
        @keyframes evaWorkingBg {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .eva-working-bg { animation: evaWorkingBg 6s ease infinite; }
        @keyframes evaWorkingMsg {
          0% { opacity: 0; transform: translateY(6px); }
          18% { opacity: 1; transform: translateY(0); }
          82% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-6px); }
        }
        .eva-working-msg { animation: evaWorkingMsg ${intervalMs}ms ease-in-out infinite; }
      `}</style>
    </div>
  );
}
