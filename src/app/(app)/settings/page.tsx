"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { signOutSupabase } from "@/lib/auth/session";
import { hasSupabaseClientConfig } from "@/lib/supabase/client";
import { AiStatusBadge, useAiStatus } from "@/components/ai-status";
import { Badge, Button, Card, Field, Input, Modal, PageHeader, useToast } from "@/components/ui";
import { PendingFlow } from "@/components/pending-flow";
import { MetaConnectionCard } from "@/components/meta-connection-card";
import { SearchableCountrySelect } from "@/components/inputs";
import { BrandKitEditor } from "@/components/brand-kit";
import { SocialLinksEditor } from "@/components/social-links-editor";
import { emptyBrandKit } from "@/lib/store";
import type { SocialLink } from "@/lib/types";
import { suggestPending } from "@/lib/eva-suggest";
import {
  completionPercent,
  missingCriticalQuestions,
  pendingQuestions,
  questionsForSection,
  sectionsStatus,
  type BusinessQuestion,
} from "@/lib/business-questions";
import {
  Trash2,
  Sparkles,
  AlertCircle,
  Check,
  PencilLine,
  Building2,
  SlidersHorizontal,
  User,
  Instagram,
  Bot,
  Briefcase,
  Palette,
  FileEdit,
  PlusCircle,
} from "lucide-react";

// Header de card con icono (item 23).
function CardHeader({ icon: Icon, title, children }: { icon: any; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-subtle-bg text-accent ring-1 ring-inset ring-accent-subtle-ring">
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

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
  // Editor de identidad visual completo (item 23)
  const [brandKitOpen, setBrandKitOpen] = useState(false);

  return (
    <div className="space-y-6">
      {node}
      <PageHeader title="Configuración" subtitle="Tu cuenta, la información de tu negocio y la IA." />

      {/* ── Información del negocio ── */}
      {business && (
        <Card className="space-y-5">
          <div>
            <CardHeader icon={Building2} title="Información del negocio" />
            <p className="mt-1 text-sm text-muted-foreground">
              Actualizá lo que Eva sabe de tu marca. Cuanta más información tenga, mejores estrategias y contenidos puede generar.
            </p>
          </div>

          {/* Completitud */}
          {(() => {
            const pct = completionPercent(business);
            return (
              <div>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-semibold text-foreground-muted">Tu perfil está {pct}% completo</span>
                  <span className="text-faint">{pct < 100 ? "Sumá lo que falta para mejorar tus contenidos" : "¡Completo!"}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-surface-muted">
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
              <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-amber-200/70 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/40 p-4 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
                  <div>
                    <p className="font-semibold text-amber-800 dark:text-amber-200">
                      {crit.length > 0
                        ? `Falta información necesaria para tu estrategia (${crit.length}).`
                        : "Todavía hay información que puede mejorar tus contenidos."}
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">Completala de a una pregunta por vez.</p>
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
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground-soft">{s.label}</p>
                    <span
                      className={
                        "mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold " +
                        (tone === "ok"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                          : tone === "crit"
                            ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300"
                            : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300")
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
                      s.key === "brandkit"
                        ? setBrandKitOpen(true)
                        : setFlow({ title: s.label, questions: questionsForSection(s.key) })
                    }
                  >
                    <PencilLine className="h-3.5 w-3.5" /> Editar
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Acciones separadas (items 23 / 25) */}
          <div className="flex flex-wrap gap-2 border-t border-border-subtle pt-4">
            <Button variant="outline" size="sm" onClick={() => setBrandKitOpen(true)}>
              <Palette className="h-4 w-4" /> Editar identidad visual
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push("/onboarding?edit=1")}>
              <FileEdit className="h-4 w-4" /> Editar formulario completo
            </Button>
            <Link href="/onboarding" className="ml-auto inline-flex items-center gap-1.5 self-center text-xs font-medium text-faint hover:text-muted-foreground-2">
              <PlusCircle className="h-3.5 w-3.5" /> Crear otro negocio
            </Link>
          </div>
        </Card>
      )}

      {/* ── Datos rápidos del negocio activo ── */}
      {business && (
        <Card className="space-y-4">
          <CardHeader icon={SlidersHorizontal} title="Datos rápidos" />
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
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(business.brandColors[0] || "") ? business.brandColors[0] : "#ec4899"}
                  onChange={(e) =>
                    upsertBusiness({ ...business, brandColors: [e.target.value, ...business.brandColors.slice(1)] })
                  }
                  className="h-11 w-12 shrink-0 rounded-xl border border-border-strong"
                  aria-label="Selector de color"
                />
                <Input
                  value={business.brandColors[0] || ""}
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    const hex = v === "" || v.startsWith("#") ? v : `#${v}`;
                    upsertBusiness({ ...business, brandColors: [hex, ...business.brandColors.slice(1)] });
                  }}
                  placeholder="#RRGGBB"
                  aria-label="Código HEX"
                />
              </div>
            </Field>
          </div>
        </Card>
      )}

      {/* ── Redes y links (item 2) ── */}
      {business && (
        <Card className="space-y-4">
          <div>
            <CardHeader icon={Instagram} title="Redes y links" />
            <p className="mt-1 text-sm text-muted-foreground">
              Las redes que Eva detectó de tu web, con su link. Revisá o sumá las que falten.
            </p>
          </div>
          <SocialLinksEditor
            business={business}
            onChange={(socialLinks: SocialLink[]) =>
              upsertBusiness({
                ...business,
                businessIntelligence: {
                  ...(business.businessIntelligence || { contactInfo: {}, conversionPaths: {}, valuePropositions: [] }),
                  socialLinks,
                },
              })
            }
          />
        </Card>
      )}

      <Card className="space-y-2">
        <CardHeader icon={User} title="Cuenta" />
        <p className="flex items-center gap-2 text-sm text-muted-foreground">{user?.email} {user?.isDemo && <Badge tone="yellow">Demo</Badge>}</p>
      </Card>

      {/* ── Conexión Instagram/Facebook (Meta) ── */}
      {business && (
        <MetaConnectionCard businessId={business.id} isDemo={!!user?.isDemo || !!business.isDemo} />
      )}

      <Card className="space-y-3">
        <CardHeader icon={Bot} title="Generación con IA">
          <AiStatusBadge />
        </CardHeader>
        {status?.hasTextAI ? (
          <p className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-100 dark:ring-emerald-900">
            Eva usa {status.textProvider === "anthropic" ? "Claude (Anthropic)" : "OpenAI"} para textos
            {status.hasImageAI ? " e imágenes reales." : ". Las imágenes usan placeholder o OpenAI si está configurado."}
          </p>
        ) : (
          <div className="space-y-2 text-sm text-muted-foreground-2">
            <p>
              Estás en <strong>modo demo</strong>: Eva usa contenidos mock inteligentes y placeholders de marca.
              La app funciona completa igual.
            </p>
            <p>Para activar IA real, agregá tu clave en un archivo <code className="rounded bg-surface-muted px-1">.env.local</code>:</p>
            <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-3 text-xs text-zinc-100">{`ANTHROPIC_API_KEY=sk-ant-...
AI_TEXT_PROVIDER=anthropic
# opcional: OPENAI_API_KEY=sk-... (imágenes)`}</pre>
            <p className="text-xs text-faint">Reiniciá el servidor (<code>npm run dev</code>) después de agregarla.</p>
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <CardHeader icon={Briefcase} title="Tus negocios" />
        <div className="space-y-2">
          {businesses.map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-2xl border border-border/70 px-4 py-3 text-sm transition hover:border-border-strong">
              <span className="flex items-center gap-2 font-semibold text-foreground-soft">{b.name} {b.isDemo && <Badge tone="yellow">demo</Badge>}</span>
              <button
                onClick={() => {
                  if (!confirm(`¿Eliminar "${b.name}" y todos sus contenidos? Esta acción no se puede deshacer.`)) return;
                  deleteBusiness(b.id);
                  // Borrado explícito en el servidor (el sync nunca borra negocios)
                  api.deleteBusiness(b.id).catch(() => {});
                  show("Negocio eliminado");
                }}
                className="rounded-lg p-1.5 text-faint transition hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 dark:hover:text-red-400"
                aria-label="Eliminar negocio"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        {businesses.length === 0 && <p className="text-sm text-faint">No tenés negocios.</p>}
      </Card>

      <Card className="space-y-3 border-red-200 dark:border-red-900/60 bg-red-50/30 dark:bg-red-950/40">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300">
            <Trash2 className="h-4 w-4" />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-red-600 dark:text-red-300">Zona de peligro</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Borra los datos de este navegador y cierra la sesión. Tus datos guardados en la nube no se tocan.
        </p>
        <Button
          variant="danger"
          size="lg"
          onClick={async () => {
            if (!confirm("¿Borrar los datos locales y cerrar sesión?")) return;
            if (hasSupabaseClientConfig()) {
              await signOutSupabase();
            }
            resetAll();
            router.replace("/login");
          }}
        >
          Borrar todo y cerrar sesión
        </Button>
      </Card>

      {/* Legal — acceso discreto al pie de todo */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-2 text-xs text-faint">
        <Link href="/legal/privacy" className="transition hover:text-muted-foreground">
          Política de Privacidad
        </Link>
        <span aria-hidden>·</span>
        <Link href="/legal/terms" className="transition hover:text-muted-foreground">
          Términos y Condiciones
        </Link>
        <span aria-hidden>·</span>
        <Link href="/legal/meta-data-deletion" className="transition hover:text-muted-foreground">
          Eliminación de datos
        </Link>
      </div>

      {/* Modal: editor de identidad visual completo — logo, colores, fonts, tono (item 23) */}
      <Modal open={brandKitOpen} onClose={() => setBrandKitOpen(false)} title="Identidad visual">
        {business && (
          <>
            <BrandKitEditor
              business={business}
              brandKit={business.brandKit || emptyBrandKit()}
              onChange={(patch) =>
                upsertBusiness({ ...business, brandKit: { ...(business.brandKit || emptyBrandKit()), ...patch } })
              }
            />
            <Button variant="success" size="lg" className="mt-5 w-full" onClick={() => { setBrandKitOpen(false); show("Identidad visual guardada ✓"); }}>
              Guardar identidad visual
            </Button>
          </>
        )}
      </Modal>

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
