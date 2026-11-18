"use client";

import { PlatformLogo } from "@/components/platform-logo";
import type { Business, Channel } from "@/lib/types";
import { Check } from "lucide-react";
import { useEffect } from "react";

// ── Paso 7: Cuentas donde publicar ───────────────────────────
// Selección libre entre las redes publicables (no incluye TikTok: no hay
// publicación por API). Define publishChannels, que la estrategia usa como
// recommendedChannels.
const PUBLISH_CHANNEL_OPTIONS: { channel: Channel; hint: string }[] = [
  { channel: "Instagram", hint: "Cuenta profesional (Business o Creator)" },
  { channel: "Facebook", hint: "Página de Facebook" },
  { channel: "LinkedIn", hint: "Página de empresa" },
];

export function StepPublish({
  b,
  set,
  missing,
}: {
  b: Business;
  set: (p: Partial<Business>) => void;
  missing: Set<string>;
}) {
  // Pre-seleccción sensata la primera vez: las redes publicables que el negocio
  // ya marcó como canales actuales; si ninguna, Instagram por defecto.
  useEffect(() => {
    if (b.publishChannels !== undefined) return;
    const fromMarketing = PUBLISH_CHANNEL_OPTIONS.map((o) => o.channel).filter((c) =>
      (b.marketingChannels || []).some((m) => m.toLowerCase().includes(c.toLowerCase()))
    );
    set({ publishChannels: fromMarketing.length ? fromMarketing : ["Instagram"] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = b.publishChannels || [];
  const toggle = (channel: Channel) => {
    const has = selected.includes(channel);
    set({
      publishChannels: has
        ? selected.filter((c) => c !== channel)
        : [...selected, channel],
    });
  };

  return (
    <div className="space-y-4" id="publishChannels">
      <div className="grid gap-3 sm:grid-cols-3">
        {PUBLISH_CHANNEL_OPTIONS.map(({ channel, hint }) => {
          const active = selected.includes(channel);
          return (
            <button
              key={channel}
              type="button"
              onClick={() => toggle(channel)}
              aria-pressed={active}
              className={
                "flex items-center gap-3 rounded-2xl border px-4 py-4 text-left transition " +
                (active
                  ? "border-loca-400 bg-accent-subtle-bg ring-2 ring-accent-subtle-ring"
                  : "border-border bg-card opacity-80 hover:opacity-100 hover:border-border-strong")
              }
            >
              <PlatformLogo channel={channel} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold tracking-tight text-foreground">{channel}</span>
                <span className="block truncate text-xs text-muted-foreground">{hint}</span>
              </span>
              {active && <Check className="h-5 w-5 shrink-0 text-accent" />}
            </button>
          );
        })}
      </div>
      {missing.has("publishChannels") && (
        <p className="text-sm font-medium text-red-600 dark:text-red-300">
          Elegí al menos una cuenta donde publicar.
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        Vas a poder cambiar esto cuando quieras, y conectar cada cuenta desde Configuración.
      </p>
    </div>
  );
}
