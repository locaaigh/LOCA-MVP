"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { AiStatusBadge, useAiStatus } from "@/components/ai-status";
import { Badge, Button, Card, Field, Input, Modal, PageHeader, useToast } from "@/components/ui";
import { PendingFlow } from "@/components/pending-flow";
import { SearchableCountrySelect } from "@/components/inputs";
import { suggestPending } from "@/lib/eva-suggest";
import {
  completionPercent,
  missingCriticalQuestions,
  pendingQuestions,
  questionsForSection,
  sectionsStatus,
  type BusinessQuestion,
} from "@/lib/business-questions";
import { Trash2, Sparkles, AlertCircle, Check, PencilLine } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const user = useStore((s) => s.user);
  const business = useStore((s) => s.businesses.find((b) => b.id === s.activeBusinessId) || null);
  const businesses = useStore((s) => s.businesses);
  const upsertBusiness = useStore((s) => s.upsertBusiness);
  const deleteBusiness = useStore((s) => s.deleteBusiness);
  const resetAll = useStore((s) => s.resetAll);
  const status = useAiStatus();
  const { show, node } = useToast();

  // Flujo de pendientes / edición por sección (modal con PendingFlow)
  const [flow, setFlow] = useState<{ title: string; questions: BusinessQuestion[] } | null>(null);

  return (
    <div className="space-y-6">
      {node}
      <PageHeader title="Configuración" subtitle="Tu cuenta, la información de tu negocio y la IA." />

      {/* ── Información del negocio ── */}
      {business && (
        <Card className="space-y-5">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-zinc-900">Información del negocio</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Actualizá lo que Eva sabe de tu marca. Cuanta más información tenga, mejores estrategias y contenidos puede generar.
            </p>
          </div>

          {/* Completitud */}
          {(() => {
            const pct = completionPercent(business);
            return (
              <div>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-semibold text-zinc-700">Tu perfil está {pct}% completo</span>
                  <span className="text-zinc-400">{pct < 100 ? "Sumá lo que falta para mejorar tus contenidos" : "¡Completo!"}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-loca-500 to-loca-400 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })()}

          {/* Banner de pendientes */}
          {(() => {
            const crit = missingCriticalQuestions(business);
            const pend = pendingQuestions(business);
            if (pend.length === 0) return null;
            return (
              <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/40 p-4 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-semibold text-amber-800">
                      {crit.length > 0
                        ? `Falta información necesaria para tu estrategia (${crit.length}).`
                        : "Todavía hay información que puede mejorar tus contenidos."}
                    </p>
                    <p className="text-sm text-amber-700">Completala de a una pregunta por vez.</p>
                  </div>
                </div>
                <Button
                  size="lg"
                  className="shrink-0"
                  onClick={() => setFlow({ title: "Completar pendientes", questions: pendingQuestions(business) })}
                >
                  <Sparkles className="h-4 w-4" /> Completar pendientes
                </Button>
              </div>
            );
          })()}

          {/* Secciones */}
          <div className="grid gap-3 sm:grid-cols-2">
            {sectionsStatus(business).map((s) => {
              const tone =
                s.missing === 0 ? "ok" : s.missingCritical > 0 ? "crit" : "rec";
              return (
                <div
                  key={s.key}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200/70 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-zinc-800">{s.label}</p>
                    <span
                      className={
                        "mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold " +
                        (tone === "ok"
                          ? "bg-emerald-50 text-emerald-700"
                          : tone === "crit"
                            ? "bg-red-50 text-red-600"
                            : "bg-amber-50 text-amber-700")
                      }
                    >
                      {tone === "ok" ? (
                        <>
                          <Check className="h-3 w-3" /> Completo
                        </>
                      ) : tone === "crit" ? (
                        `Falta (${s.missing})`
                      ) : (
                        `Recomendado (${s.missing})`
                      )}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setFlow({ title: s.label, questions: questionsForSection(s.key) })
                    }
                  >
                    <PencilLine className="h-3.5 w-3.5" /> Editar
                  </Button>
                </div>
              );
            })}
          </div>

          <Link href="/onboarding" className="inline-flex text-sm font-semibold text-loca-600 hover:underline">
            Editar el formulario completo / crear otro negocio →
          </Link>
        </Card>
      )}

      {/* ── Datos rápidos del negocio activo ── */}
      {business && (
        <Card className="space-y-4">
          <h2 className="text-lg font-bold tracking-tight text-zinc-900">Datos rápidos</h2>
          <Field label="Nombre">
            <Input value={business.name} onChange={(e) => upsertBusiness({ ...business, name: e.target.value })} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="País">
              <SearchableCountrySelect
                value={business.country}
                onChange={(v) => upsertBusiness({ ...business, country: v })}
              />
            </Field>
            <Field label="Ciudad">
              <Input value={business.city} onChange={(e) => upsertBusiness({ ...business, city: e.target.value })} />
            </Field>
            <Field label="Color de marca">
              <input
                type="color"
                value={business.brandColors[0] || "#ec4899"}
                onChange={(e) =>
                  upsertBusiness({ ...business, brandColors: [e.target.value, ...business.brandColors.slice(1)] })
                }
                className="h-11 w-full rounded-xl border border-zinc-300"
              />
            </Field>
          </div>
        </Card>
      )}

      <Card className="space-y-2">
        <h2 className="text-lg font-bold tracking-tight text-zinc-900">Cuenta</h2>
        <p className="flex items-center gap-2 text-sm text-zinc-500">{user?.email} {user?.isDemo && <Badge tone="yellow">Demo</Badge>}</p>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-zinc-900">Generación con IA</h2>
          <AiStatusBadge />
        </div>
        {status?.hasOpenAI ? (
          <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 ring-1 ring-inset ring-emerald-100">
            Tu API key está configurada. Eva genera textos e imágenes reales.
          </p>
        ) : (
          <div className="space-y-2 text-sm text-zinc-600">
            <p>
              Estás en <strong>modo demo</strong>: Eva usa contenidos mock inteligentes y placeholders de marca.
              La app funciona completa igual.
            </p>
            <p>Para activar IA real, agregá tu clave en un archivo <code className="rounded bg-zinc-100 px-1">.env.local</code>:</p>
            <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-3 text-xs text-zinc-100">OPENAI_API_KEY=sk-...</pre>
            <p className="text-xs text-zinc-400">Reiniciá el servidor (<code>npm run dev</code>) después de agregarla.</p>
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-bold tracking-tight text-zinc-900">Tus negocios</h2>
        <div className="space-y-2">
          {businesses.map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-2xl border border-zinc-200/70 px-4 py-3 text-sm transition hover:border-zinc-300">
              <span className="flex items-center gap-2 font-semibold text-zinc-800">{b.name} {b.isDemo && <Badge tone="yellow">demo</Badge>}</span>
              <button
                onClick={() => {
                  deleteBusiness(b.id);
                  show("Negocio eliminado");
                }}
                className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-red-50 hover:text-red-500"
                aria-label="Eliminar negocio"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        {businesses.length === 0 && <p className="text-sm text-zinc-400">No tenés negocios.</p>}
      </Card>

      <Card className="space-y-3 border-red-200 bg-red-50/30">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-red-100 text-red-600">
            <Trash2 className="h-4 w-4" />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-red-600">Zona de peligro</h2>
        </div>
        <p className="text-sm text-zinc-500">Borra todos los datos locales (negocios, estrategias, contenidos).</p>
        <Button
          variant="danger"
          size="lg"
          onClick={() => {
            resetAll();
            router.replace("/login");
          }}
        >
          Borrar todo y cerrar sesión
        </Button>
      </Card>

      {/* Modal: flujo enfocado de preguntas (pendientes / editar sección) */}
      <Modal open={!!flow} onClose={() => setFlow(null)} title={flow?.title || ""}>
        {flow && business && (
          <PendingFlow
            business={business}
            questions={flow.questions}
            applyPatch={(patch) => upsertBusiness({ ...business, ...patch })}
            onSuggest={() => {
              const { patch, statuses } = suggestPending(business);
              upsertBusiness({
                ...business,
                ...patch,
                fieldStatuses: { ...business.fieldStatuses, ...statuses },
              });
              show("Eva sugirió lo que pudo. Revisalo y editá lo que quieras 💗");
            }}
            onDone={() => {
              setFlow(null);
              show("Listo, información actualizada ✓");
            }}
            doneLabel="Terminar"
          />
        )}
      </Modal>
    </div>
  );
}
