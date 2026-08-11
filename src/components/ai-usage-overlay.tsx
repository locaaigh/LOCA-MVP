"use client";

// Overlay de debug (solo testing/MVP): totales de tokens/costo de IA de la
// sesión del browser. Se apaga con NEXT_PUBLIC_SHOW_AI_USAGE=false — el log
// en la base de datos (ai_usage_log) sigue funcionando independientemente.
import * as React from "react";
import { useAiUsageStore } from "@/lib/ai-usage-store";

export function AiUsageOverlay() {
  const entries = useAiUsageStore((s) => s.entries);
  const [open, setOpen] = React.useState(false);

  if (process.env.NEXT_PUBLIC_SHOW_AI_USAGE !== "true") return null;
  if (!entries.length) return null;

  const totalCost = entries.reduce((sum, e) => sum + e.costUsd, 0);
  const totalTokens = entries.reduce((sum, e) => sum + e.inputTokens + e.outputTokens, 0);
  const recent = [...entries].reverse().slice(0, 20);

  return (
    <div className="fixed bottom-4 right-4 z-[9999] font-mono text-xs">
      {open && (
        <div className="mb-2 max-h-80 w-72 overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-zinc-200 shadow-xl">
          <p className="mb-2 font-bold text-faint">Uso de IA (sesión)</p>
          <ul className="space-y-1.5">
            {recent.map((e) => (
              <li key={e.id} className="border-b border-zinc-800 pb-1.5">
                <div className="flex justify-between">
                  <span className="text-zinc-300">{e.agent}</span>
                  <span>${e.costUsd.toFixed(4)}</span>
                </div>
                <div className="text-muted-foreground">
                  {e.provider}
                  {e.model ? ` · ${e.model}` : ""} · {e.inputTokens}+{e.outputTokens} tok
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200 shadow-xl transition hover:bg-zinc-800"
      >
        🪙 {totalTokens.toLocaleString("es-AR")} tok · ${totalCost.toFixed(4)}
      </button>
    </div>
  );
}
