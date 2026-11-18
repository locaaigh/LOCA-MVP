"use client";

import { Logo } from "@/components/brand";
import { Button, EVA_THINKING_WEB, EvaLoading } from "@/components/ui";
import { ArrowLeft, Globe, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

// ─────────────────────────────────────────────────────────────
// PANTALLA WEB: input gigante de URL → analizar
// ─────────────────────────────────────────────────────────────
export function WebImportScreen({
  initialUrl,
  loading,
  onAnalyze,
  onBack,
}: {
  initialUrl: string;
  loading: boolean;
  onAnalyze: (url: string) => void;
  onBack: () => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden loca-hero-bg">
      <div className="loca-orb left-[-10%] top-[-8%] h-80 w-80 animate-orb-drift bg-loca-200/50" />
      <div className="loca-orb bottom-[-14%] right-[-8%] h-80 w-80 animate-orb-drift bg-lima-200/40" style={{ animationDelay: "-5s" }} />

      <div className="flex items-center justify-between px-6 pt-7 sm:px-10">
        <Link href="/">
          <Logo className="text-2xl" />
        </Link>
        {!loading && (
          <button onClick={onBack} className="flex items-center gap-1 text-sm font-semibold text-faint transition hover:text-foreground-muted">
            <ArrowLeft className="h-4 w-4" /> Volver
          </button>
        )}
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-6 sm:px-6">
        {loading ? (
          <div className="w-full max-w-xl animate-fade-in-up">
            <EvaLoading messages={EVA_THINKING_WEB} />
          </div>
        ) : (
          <div className="w-full max-w-xl animate-fade-in-up text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-loca-500 to-loca-700 text-white shadow-lift ring-8 ring-loca-50">
              <Globe className="h-8 w-8" />
            </div>
            <h1 className="text-[2rem] font-extrabold tracking-tight text-foreground sm:text-[2.6rem] sm:leading-[1.05]">
              Pegá la web de tu negocio
            </h1>
            <p className="mx-auto mt-3 max-w-md text-[15px] text-muted-foreground sm:text-base">
              Eva va a leer tu sitio y detectar tu marca, productos, servicios y datos clave. Lo que no encuentre, queda pendiente.
            </p>

            <div className="mt-8 rounded-[1.75rem] border border-border/50 bg-card p-6 shadow-card sm:p-7">
              <div className="relative">
                <Globe className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-loca-400" />
                <input
                  autoFocus
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onAnalyze(url);
                  }}
                  placeholder="https://tumarca.com"
                  className="loca-input h-[4.5rem] rounded-2xl pl-14 text-center text-lg sm:text-xl"
                />
              </div>
              <Button size="xl" className="mt-4 w-full" onClick={() => onAnalyze(url)}>
                <Sparkles className="h-5 w-5" /> Analizar mi web
              </Button>
            </div>

            <p className="mx-auto mt-4 max-w-md text-[13px] text-faint">
              No inventamos precios ni datos sensibles. Si algo no aparece en tu web, te lo vamos a pedir después.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
