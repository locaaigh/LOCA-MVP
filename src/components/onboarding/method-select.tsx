"use client";

import { Logo } from "@/components/brand";
import { ArrowRight, Bot, Globe, Pencil, Sparkles } from "lucide-react";
import Link from "next/link";

// ─────────────────────────────────────────────────────────────
// PANTALLA INICIAL: elección de método (independiente del wizard)
// ─────────────────────────────────────────────────────────────
export type StartMode = "ai" | "web" | "manual";

export function MethodSelect({ onPick }: { onPick: (m: StartMode) => void }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden loca-hero-bg">
      <div className="loca-orb left-[-12%] top-[-10%] h-80 w-80 animate-orb-drift bg-loca-200/50" />
      <div className="loca-orb bottom-[-14%] right-[-10%] h-96 w-96 animate-orb-drift bg-lima-200/40" style={{ animationDelay: "-5s" }} />

      <div className="px-6 pt-7 sm:px-10">
        <Link href="/">
          <Logo className="text-2xl" />
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-6 sm:px-6">
        <div className="w-full max-w-3xl animate-fade-in-up">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-loca-500 to-loca-700 text-white shadow-lift animate-float ring-8 ring-loca-50">
              <Sparkles className="h-8 w-8" />
            </div>
            <h1 className="text-[2rem] font-extrabold tracking-tight text-foreground sm:text-[3rem] sm:leading-[1.03]">
              ¿Cómo querés que <span className="loca-gradient-text">Eva</span><br className="hidden sm:block" /> conozca tu negocio?
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
              Empezá con tu web o con una IA que ya conozca tu marca. Eva completa todo lo posible y vos solo revisás.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <MethodCard
              icon={Globe}
              badge="Lo más fácil"
              badgeTone="lima"
              title="Pegar mi web"
              desc="Eva lee tu sitio y completa marca, productos, servicios y datos clave. Vos solo revisás."
              cta="Leer mi web"
              onClick={() => onPick("web")}
            />
            <MethodCard
              icon={Bot}
              badge="Si ya usás IA"
              badgeTone="pink"
              title="Subir resumen de mi IA"
              desc="Copiá un prompt, pedile a ChatGPT, Claude o Gemini un .md y subilo en LOCA."
              cta="Usar mi IA"
              onClick={() => onPick("ai")}
            />
          </div>

          <button
            onClick={() => onPick("manual")}
            className="group mx-auto mt-5 flex w-full max-w-xl items-center gap-3 rounded-2xl border border-border bg-card/60 px-5 py-3.5 text-left transition hover:border-border-strong hover:bg-card sm:mt-6"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-muted-foreground">
              <Pencil className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground-muted">Prefiero completar manualmente</span>
              <span className="block text-xs text-faint">Paso a paso, con sugerencias de Eva cuando las necesites.</span>
            </span>
            <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-faint transition group-hover:text-foreground-muted">
              Completar a mano <ArrowRight className="h-4 w-4" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function MethodCard({
  icon: Icon,
  badge,
  badgeTone,
  title,
  desc,
  cta,
  onClick,
}: {
  icon: any;
  badge: string;
  badgeTone: "lima" | "pink";
  title: string;
  desc: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative flex h-full flex-col rounded-[1.75rem] border border-border/60 bg-card/90 p-7 text-left shadow-card backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-loca-200 hover:shadow-glow"
    >
      <span
        className={`absolute right-5 top-5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
          badgeTone === "lima" ? "bg-lima-100 dark:bg-lima-900/50 text-lima-700 dark:text-lima-300" : "bg-loca-100 dark:bg-accent-subtle-bg text-accent-subtle-fg"
        }`}
      >
        {badge}
      </span>
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-loca-50 to-loca-100 dark:from-accent-subtle-bg dark:to-accent-subtle-bg text-accent shadow-sm ring-1 ring-accent-subtle-ring/60 transition-all duration-300 group-hover:scale-105 group-hover:from-loca-500 group-hover:to-loca-700 group-hover:text-white group-hover:shadow-lift">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="mt-6 text-[1.35rem] font-bold leading-tight tracking-tight text-foreground">{title}</h3>
      <p className="mt-2 flex-1 text-[15px] leading-relaxed text-muted-foreground">{desc}</p>
      <span className="mt-6 inline-flex items-center gap-2 text-[15px] font-semibold text-accent">
        {cta}
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-subtle-bg transition-all duration-300 group-hover:bg-loca-600 group-hover:text-white">
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </span>
      </span>
    </button>
  );
}
