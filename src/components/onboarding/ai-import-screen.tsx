"use client";

import { Logo } from "@/components/brand";
import { StepDot } from "@/components/onboarding/pending-screen";
import { Button, EVA_THINKING_MD, EvaLoading, Textarea, useToast } from "@/components/ui";
import { emptyMdTemplate, externalAiPrompt } from "@/lib/md-import";
import { copyToClipboard, downloadFile } from "@/lib/utils";
import { ArrowLeft, Bot, Copy, Download, FileText, Sparkles, Upload } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────
// PANTALLA IA EXTERNA: prompt + subir/pegar .md
// ─────────────────────────────────────────────────────────────
export function AiImportScreen({
  businessName,
  onLoad,
  onBack,
}: {
  businessName: string;
  onLoad: (md: string, fileName: string) => void;
  onBack: () => void;
}) {
  const [md, setMd] = useState("");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const prompt = externalAiPrompt(businessName);
  const { show, node } = useToast();

  async function copyPrompt() {
    const ok = await copyToClipboard(prompt);
    show(ok ? "Prompt copiado. Pegalo en tu IA." : "No se pudo copiar");
  }
  async function onFile(file: File) {
    setMd(await file.text());
    setFileName(file.name);
  }
  async function handleLoad() {
    if (!md.trim()) {
      show("Subí el archivo .md o pegá el contenido primero.");
      return;
    }
    setLoading(true);
    const started = Date.now();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    const minMs = 1200;
    const elapsed = Date.now() - started;
    if (elapsed < minMs) await new Promise((r) => setTimeout(r, minMs - elapsed));
    onLoad(md, fileName);
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden loca-hero-bg">
      {node}
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
            <EvaLoading messages={EVA_THINKING_MD} />
          </div>
        ) : (
        <div className="w-full max-w-xl animate-fade-in-up">
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-loca-500 to-loca-700 text-white shadow-lift ring-8 ring-loca-50">
              <Bot className="h-8 w-8" />
            </div>
            <h1 className="text-[2rem] font-extrabold tracking-tight text-foreground sm:text-[2.4rem] sm:leading-[1.05]">
              Usá una IA que ya te conoce
            </h1>
            <p className="mx-auto mt-3 max-w-md text-[15px] text-muted-foreground">
              Tres pasos: copiá el prompt, pegalo en tu IA y subí el archivo que te devuelva.
            </p>
          </div>

          <div className="mt-7 space-y-5 rounded-[1.75rem] border border-border/50 bg-card p-6 shadow-card sm:p-7">
            {/* Paso 1 */}
            <div className="flex gap-4">
              <StepDot n={1} />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-foreground">Copiá el prompt</p>
                <p className="text-[13px] text-muted-foreground">Lo necesitás para pedirle a tu IA el resumen.</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button size="lg" className="flex-1" onClick={copyPrompt}>
                    <Copy className="h-4 w-4" /> Copiar prompt
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="flex-1"
                    onClick={() => downloadFile("loca-resumen-negocio.md", emptyMdTemplate(), "text/markdown")}
                  >
                    <Download className="h-4 w-4" /> Plantilla
                  </Button>
                </div>
              </div>
            </div>

            {/* Paso 2 */}
            <div className="flex gap-4 border-t border-border-subtle pt-5">
              <StepDot n={2} />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-foreground">Pegalo en tu IA</p>
                <p className="text-[13px] text-muted-foreground">
                  ChatGPT, Claude o Gemini. Pedile un archivo <span className="font-semibold text-foreground-muted">.md</span> o un bloque de código Markdown copiable. No PDF, Word ni Google Docs.
                </p>
              </div>
            </div>

            {/* Paso 3 */}
            <div className="flex gap-4 border-t border-border-subtle pt-5">
              <StepDot n={3} />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-foreground">Subí o pegá el .md</p>
                <button
                  onClick={() => fileInput.current?.click()}
                  className="mt-3 flex w-full flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed border-border bg-surface-subtle/40 px-4 py-6 text-center transition hover:border-loca-300 hover:bg-accent-subtle-bg/40"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-subtle-bg text-loca-500">
                    <Upload className="h-5 w-5" />
                  </span>
                  <span className="mt-1 text-sm font-semibold text-foreground-muted">Subí el archivo .md</span>
                  {fileName ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-300"><FileText className="h-3 w-3" /> {fileName}</span>
                  ) : (
                    <span className="text-xs text-faint">o pegá el contenido abajo</span>
                  )}
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  accept=".md,.markdown,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onFile(f);
                    e.target.value = "";
                  }}
                />
                <Textarea
                  value={md}
                  onChange={(e) => setMd(e.target.value)}
                  placeholder="o pegá acá el Markdown que te devolvió tu IA…"
                  className="mt-3 min-h-[90px] text-xs"
                />
              </div>
            </div>

            <Button size="xl" className="w-full" onClick={() => void handleLoad()}>
              <Sparkles className="h-5 w-5" /> Cargar información
            </Button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
