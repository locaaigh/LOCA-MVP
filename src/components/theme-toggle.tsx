"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "Sistema", icon: Monitor },
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
];

/**
 * Control de tema: solo iconos (Sistema / Claro / Oscuro).
 * El activo se resalta; al pasar el mouse aparece el tooltip con el nombre.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  return (
    <div
      role="radiogroup"
      aria-label="Tema de la interfaz"
      className={cn(
        "inline-flex items-center gap-1 rounded-2xl border border-border bg-surface-subtle p-1",
        className
      )}
    >
      {OPTIONS.map((opt) => {
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt.label}
            title={opt.label}
            onClick={() => setTheme(opt.value)}
            className={cn(
              "inline-flex h-8 w-9 items-center justify-center rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-card text-accent shadow-sm ring-1 ring-border"
                : "text-muted-foreground hover:bg-card/70 hover:text-foreground"
            )}
          >
            <opt.icon className="h-[18px] w-[18px] shrink-0" />
          </button>
        );
      })}
    </div>
  );
}
