"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { enterDemoMode } from "@/lib/auth/session";
import { DEMO_PROFILES } from "@/lib/demo";
import { Logo } from "@/components/brand";
import { EvaLoading } from "@/components/ui";
import { ArrowRight } from "lucide-react";

export default function DemoPage() {
  const router = useRouter();
  const hydrated = useStore((s) => s.hydrated);
  const [loading, setLoading] = useState(false);

  async function pick(id: string) {
    setLoading(true);
    await enterDemoMode(id);
    router.push("/dashboard");
  }

  if (!hydrated || loading) {
    return (
      <main className="loca-soft-bg flex min-h-screen items-center justify-center px-5">
        <EvaLoading text="Preparando tu demo…" />
      </main>
    );
  }

  return (
    <main className="loca-soft-bg flex min-h-screen flex-col items-center px-5 py-12">
      <Link href="/">
        <Logo className="text-2xl" />
      </Link>

      <div className="mx-auto mt-10 w-full max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          ¿Qué demo querés ver?
        </h1>
        <p className="mt-3 text-[15px] text-muted-foreground-2">
          Elegí un tipo de negocio y probá LOCA con datos de ejemplo. Podés generar y aprobar
          estrategia y contenidos — nada se publica de verdad.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {DEMO_PROFILES.map((p) => (
            <button
              key={p.id}
              onClick={() => pick(p.id)}
              className="group flex flex-col items-center rounded-3xl border border-border/80 bg-card p-6 text-center shadow-soft transition hover:-translate-y-0.5 hover:border-loca-300 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-loca-300"
            >
              <span className="text-4xl leading-none">{p.emoji}</span>
              <span className="mt-4 text-base font-bold text-foreground">{p.label}</span>
              <span className="mt-1 text-sm text-muted-foreground-2">{p.tagline}</span>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent opacity-0 transition group-hover:opacity-100">
                Ver demo <ArrowRight className="h-4 w-4" />
              </span>
            </button>
          ))}
        </div>

        <Link href="/" className="mt-8 inline-block text-sm font-medium text-muted-foreground hover:text-foreground-muted">
          ← Volver
        </Link>
      </div>
    </main>
  );
}
