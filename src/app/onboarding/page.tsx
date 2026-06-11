"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStore, emptyBusiness } from "@/lib/store";
import {
  INDUSTRIES,
  SUBCATEGORIES,
  BUSINESS_TYPES,
  VALUE_SUGGESTIONS,
  ADVANTAGE_SUGGESTIONS,
  AGE_RANGES,
  MARKETING_ACTIVITIES,
  SEASONALITY_OPTIONS,
  SPECIAL_DATES_OPTIONS,
  GENDER_OPTIONS,
  foundingYearOptions,
} from "@/lib/constants";
import type { Business, ProductService, ProductServiceType, WebsiteAnalysis } from "@/lib/types";
import { Button, Card, ChipSelect, Field, Input, Select, Textarea, useToast } from "@/components/ui";
import {
  HelpField,
  SearchableCountrySelect,
  SearchableRegionSelect,
  OptionCards,
  YesNoChoice,
  EvaSuggestionButton,
} from "@/components/inputs";
import { ChannelSelector } from "@/components/channel-selector";
import {
  ProductServiceCard,
  ProductServiceForm,
  ProductServiceImporter,
} from "@/components/product-service";
import { BrandKitEditor } from "@/components/brand-kit";
import { OnboardingSummary } from "@/components/onboarding-summary";
import { Logo, EvaAvatar } from "@/components/brand";
import { EvaChatBubble } from "@/components/eva-chat";
import { getFieldExample } from "@/lib/examples";
import { getMissingRequiredFields } from "@/lib/onboarding-validation";
import { emptyBrandKit } from "@/lib/store";
import { api } from "@/lib/api";
import { uid } from "@/lib/utils";
import { Check, Globe, Sparkles, ArrowRight, Plus } from "lucide-react";
import type { FieldStatusKind } from "@/lib/types";

const STEPS = [
  "Empecemos fácil",
  "Negocio",
  "Marca",
  "Identidad visual",
  "Productos / Servicios",
  "Audiencia",
  "Objetivos",
  "Resumen",
];
const CURRENT_YEAR = 2026;
const SUMMARY_STEP = STEPS.length - 1; // 7

export default function OnboardingPage() {
  const router = useRouter();
  const user = useStore((s) => s.user);
  const login = useStore((s) => s.login);
  const upsertBusiness = useStore((s) => s.upsertBusiness);
  const { show, node } = useToast();

  const [step, setStep] = useState(0);
  const [b, setB] = useState<Business>(() => emptyBusiness(user?.id || "anon"));
  const [missing, setMissing] = useState<Set<string>>(new Set());

  // set normal: si el usuario edita un campo que Eva había marcado, pasa a "Editado por vos".
  const set = (patch: Partial<Business>) =>
    setB((prev) => {
      const next = { ...prev, ...patch };
      if (prev.fieldStatuses) {
        const fs = { ...prev.fieldStatuses };
        let changed = false;
        for (const k of Object.keys(patch)) {
          if (fs[k] && fs[k].status !== "user") {
            fs[k] = { status: "user" };
            changed = true;
          }
        }
        if (changed) next.fieldStatuses = fs;
      }
      return next;
    });

  const statusOf = (f: string): FieldStatusKind | undefined => b.fieldStatuses?.[f]?.status;

  // Aplica el análisis de la web (sin marcar como editado).
  function applyAnalysis(a: WebsiteAnalysis) {
    const ff = a.foundFields;
    setB((prev) => {
      const next: Business = { ...prev };
      if (ff.name) next.name = ff.name;
      if (ff.industry) next.industry = ff.industry;
      if (ff.subcategory) next.subcategory = ff.subcategory;
      if (ff.businessType) next.businessType = ff.businessType;
      if (ff.businessModel && ["B2B", "B2C", "Ambos"].includes(ff.businessModel))
        next.businessModel = ff.businessModel as any;
      if (ff.country) next.country = ff.country;
      if (ff.state) next.state = ff.state;
      if (ff.city) next.city = ff.city;
      if (ff.shortDescription) next.shortDescription = ff.shortDescription;
      if (ff.fullDescription) next.fullDescription = ff.fullDescription;
      if (ff.values?.length) next.values = ff.values;
      if (ff.competitiveAdvantages?.length) next.competitiveAdvantages = ff.competitiveAdvantages;
      if (ff.marketingChannels?.length) next.marketingChannels = ff.marketingChannels;
      if (ff.marketingActivities?.length) next.marketingActivities = ff.marketingActivities;
      if (ff.productsServices?.length) {
        next.productsServices = ff.productsServices.map((p) => ({
          ...emptyPS(p.type),
          name: p.name,
          category: p.category || "",
          shortDescription: p.shortDescription || "",
          priceMin: p.price,
          currency: p.currency || "ARS",
          isTopSeller: !!p.isTopSeller,
          saved: true,
          importSource: "website",
        }));
      }
      if (ff.audience) {
        next.audience = {
          ...prev.audience,
          ageRanges: ff.audience.ageRanges?.length ? ff.audience.ageRanges : prev.audience.ageRanges,
          gender: (ff.audience.gender as any) || prev.audience.gender,
          socioeconomicLevel: (ff.audience.socioeconomicLevel as any) || prev.audience.socioeconomicLevel,
          segments: ff.audience.segments?.length ? ff.audience.segments : prev.audience.segments,
          painPoints: ff.audience.painPoints?.length ? ff.audience.painPoints : prev.audience.painPoints,
          behavior: ff.audience.behavior || prev.audience.behavior,
        };
      }
      if (ff.brandKit) next.brandKit = ff.brandKit;
      if (ff.businessIntelligence) next.businessIntelligence = ff.businessIntelligence;
      next.fieldStatuses = { ...prev.fieldStatuses, ...a.fieldStatuses };
      next.websiteExtractionStatus = "done";
      next.websiteExtractionConsent = true;
      return next;
    });
  }

  const subcats = useMemo(() => SUBCATEGORIES[b.industry] || [], [b.industry]);

  function tryNext() {
    const miss = getMissingRequiredFields(step, b);
    if (miss.length > 0) {
      setMissing(new Set(miss.map((m) => m.id)));
      show("Te faltan algunos datos para que Eva genere una buena estrategia.");
      const first = document.getElementById(miss[0].id);
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setMissing(new Set());
    if (step < SUMMARY_STEP) setStep(step + 1);
  }

  function finish() {
    let uid_ = user?.id;
    if (!user) {
      login(`negocio_${Date.now()}@loca.app`);
      uid_ = useStore.getState().user?.id;
    }
    // Compatibilidad: si el Brand Kit tiene colores, los reflejamos en brandColors
    // (que usan las previews y cards de contenido).
    const bkColors = b.brandKit?.colors;
    const brandColors = bkColors?.primary
      ? [bkColors.primary, bkColors.accent || bkColors.secondary || "#84cc16", bkColors.background || "#ffffff"]
      : b.brandColors;

    const finalBiz: Business = {
      ...b,
      brandColors,
      productsServices: b.productsServices.map((p) => ({ ...p, saved: true })),
      userId: uid_ || b.userId,
      onboardingComplete: true,
    };
    upsertBusiness(finalBiz);
    router.push("/strategy?generate=1");
  }

  const onSummary = step === SUMMARY_STEP;

  return (
    <main className="min-h-screen bg-zinc-50 pb-28">
      {node}
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/">
            <Logo className="text-xl" />
          </Link>
          <span className="text-sm text-zinc-400">Paso {step + 1} de {STEPS.length}</span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        {/* Stepper */}
        <div className="mb-5 flex items-center">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 items-center">
              <button
                onClick={() => i <= step && setStep(i)}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition ${
                  i < step
                    ? "bg-lima-400 text-ink"
                    : i === step
                      ? "bg-loca-600 text-white"
                      : "bg-zinc-200 text-zinc-500"
                }`}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </button>
              {i < STEPS.length - 1 && (
                <div className={`mx-1 h-0.5 flex-1 ${i < step ? "bg-lima-400" : "bg-zinc-200"}`} />
              )}
            </div>
          ))}
        </div>

        {!onSummary && (
          <>
            <h1 className="text-2xl font-bold">{STEPS[step]}</h1>
            <StepIntro step={step} />
          </>
        )}

        <div className="mt-4">
          {step === 0 && <StepWebsite b={b} set={set} applyAnalysis={applyAnalysis} onSkip={() => setStep(1)} onDone={() => setStep(1)} show={show} />}
          {step === 1 && <StepBasic b={b} set={set} subcats={subcats} missing={missing} statusOf={statusOf} />}
          {step === 2 && <StepBrand b={b} set={set} missing={missing} statusOf={statusOf} />}
          {step === 3 && <StepBrandKit b={b} set={set} />}
          {step === 4 && <StepProducts b={b} set={set} show={show} />}
          {step === 5 && <StepAudience b={b} set={set} missing={missing} />}
          {step === 6 && <StepGoals b={b} set={set} missing={missing} />}
          {step === 7 && <OnboardingSummary business={b} onConfirm={finish} onEdit={() => setStep(1)} />}
        </div>
      </div>

      {/* Sticky bottom CTA (oculto en el resumen, que tiene sus propios botones) */}
      {!onSummary && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <Button variant="ghost" onClick={() => (step === 0 ? router.push("/") : setStep(step - 1))}>
              {step === 0 ? "Cancelar" : "Atrás"}
            </Button>
            {step === 0 ? (
              <Button onClick={() => setStep(1)}>
                Continuar <ArrowRight className="h-4 w-4" />
              </Button>
            ) : step === SUMMARY_STEP - 1 ? (
              <Button onClick={tryNext}>
                Ver resumen <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={tryNext}>
                Siguiente <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      <EvaChatBubble raised />
    </main>
  );
}

function StepIntro({ step }: { step: number }) {
  const intros = [
    "Si tu negocio tiene una web, Eva puede leerla y completar gran parte del formulario por vos.",
    "Lo básico de tu negocio. No tiene que ser perfecto, podés cambiar todo después.",
    "Contanos cómo es tu marca y qué venís haciendo. Si no sabés algo, Eva te ayuda.",
    "Así Eva interpretó tu identidad visual. Revisá colores, tipografías y logos.",
    "Cargá tus productos o servicios más importantes. No hace falta todo el catálogo.",
    "¿A quién le hablás? Esto ayuda a Eva a afinar el contenido.",
    "Por último, qué querés lograr. Con esto Eva arma tu estrategia.",
  ];
  return <p className="mt-1 text-sm text-zinc-500">{intros[step]}</p>;
}

// ── Paso 3: Identidad visual (Brand Kit) ─────────────────────
function StepBrandKit({ b, set }: { b: Business; set: (p: Partial<Business>) => void }) {
  const bk = b.brandKit || emptyBrandKit();
  return (
    <BrandKitEditor brandKit={bk} onChange={(patch) => set({ brandKit: { ...bk, ...patch } })} />
  );
}

// ── Paso 0: Web ──────────────────────────────────────────────
function StepWebsite({
  b,
  set,
  applyAnalysis,
  onSkip,
  onDone,
  show,
}: {
  b: Business;
  set: (p: Partial<Business>) => void;
  applyAnalysis: (a: WebsiteAnalysis) => void;
  onSkip: () => void;
  onDone: () => void;
  show: (m: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WebsiteAnalysis | null>(null);

  async function autocomplete() {
    if (!b.websiteUrl?.trim()) {
      show("Escribí la URL de tu web primero.");
      return;
    }
    setLoading(true);
    set({ websiteExtractionStatus: "loading" });
    try {
      const res = await api.extractWebsite(b.websiteUrl.trim());
      applyAnalysis(res.data);
      setResult(res.data);
      show(res.meta?.warning || "Listo. Eva completó algunos datos. Revisalos y completá lo que falte.");
    } catch {
      set({ websiteExtractionStatus: "error" });
      show("Eva no pudo leer la web. Podés completar el formulario manualmente o probar con otra URL.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl bg-loca-50 p-4">
        <EvaAvatar size={40} />
        <p className="text-sm text-loca-800">
          No te preocupes si no sabés qué poner. Eva te va a ir ayudando en cada paso 💗
        </p>
      </div>

      <HelpField label="¿Tu negocio tiene página web?">
        <YesNoChoice value={b.hasWebsite} onChange={(v) => set({ hasWebsite: v })} />
      </HelpField>

      {b.hasWebsite && (
        <>
          <HelpField
            label="URL de tu web"
            help="Pegá el link completo, por ejemplo https://tunegocio.com"
          >
            <div className="relative">
              <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                value={b.websiteUrl || ""}
                onChange={(e) => set({ websiteUrl: e.target.value })}
                placeholder="https://cafebruma.com"
                className="pl-9"
              />
            </div>
          </HelpField>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button onClick={autocomplete} loading={loading}>
              {!loading && <Sparkles className="h-4 w-4" />}
              {loading ? "Eva está leyendo tu web…" : "Autocompletar con Eva"}
            </Button>
            <button onClick={onSkip} className="text-sm text-zinc-500 hover:text-zinc-800">
              Prefiero completarlo manualmente
            </button>
          </div>

          {/* Resultado del análisis */}
          {result && (
            <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-zinc-800">
                  Eva pudo entender tu negocio en un {Math.round((result.confidence || 0) * 100)}%
                </p>
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-500">
                  {result.mode === "ai" ? "Análisis con IA" : "Modo demo · extracción básica"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <MiniCount label="Completados" value={result.summary.completedFieldsCount} tone="emerald" />
                <MiniCount label="Para revisar" value={result.summary.reviewFieldsCount} tone="amber" />
                <MiniCount label="Faltan" value={result.summary.missingFieldsCount} tone="red" />
              </div>
              {result.foundFields.brandKit?.colors?.palette?.length ? (
                <p className="text-xs text-zinc-500">
                  También detectó una identidad visual inicial para tu marca 🎨
                </p>
              ) : null}
              <Button variant="lima" className="w-full" onClick={onDone}>
                Revisar lo que completó Eva <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {b.hasWebsite === false && (
        <p className="text-sm text-zinc-500">
          Sin problema. Completá los siguientes pasos y Eva te ayuda donde lo necesites.
        </p>
      )}
    </Card>
  );
}

function MiniCount({ label, value, tone }: { label: string; value: number; tone: "emerald" | "amber" | "red" }) {
  const cls =
    tone === "emerald" ? "text-emerald-700" : tone === "amber" ? "text-amber-700" : "text-red-600";
  return (
    <div className="rounded-lg bg-white p-2">
      <div className={`text-xl font-bold ${cls}`}>{value}</div>
      <div className="text-[11px] text-zinc-500">{label}</div>
    </div>
  );
}

// ── Paso 1: Negocio ──────────────────────────────────────────
function StepBasic({
  b,
  set,
  subcats,
  missing,
  statusOf,
}: {
  b: Business;
  set: (p: Partial<Business>) => void;
  subcats: string[];
  missing: Set<string>;
  statusOf: (f: string) => FieldStatusKind | undefined;
}) {
  return (
    <Card className="space-y-5">
      <HelpField label="Nombre de la empresa" required error={missing.has("name")} id="name" status={statusOf("name")}>
        <Input value={b.name} onChange={(e) => set({ name: e.target.value })} placeholder="Café Bruma" />
      </HelpField>

      <div className="grid gap-4 sm:grid-cols-2">
        <HelpField label="Industria" required error={missing.has("industry")} id="industry" status={statusOf("industry")}>
          <Select value={b.industry} onChange={(e) => set({ industry: e.target.value, subcategory: "" })}>
            <option value="">Elegí una industria</option>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </Select>
        </HelpField>
        <HelpField label="Subcategoría" help="Elegí la opción más parecida. No tiene que ser perfecta." status={statusOf("subcategory")}>
          {subcats.length ? (
            <Select value={b.subcategory} onChange={(e) => set({ subcategory: e.target.value })}>
              <option value="">Elegí una subcategoría</option>
              {subcats.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          ) : (
            <Input value={b.subcategory} onChange={(e) => set({ subcategory: e.target.value })} placeholder="Ej: Café" />
          )}
        </HelpField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <HelpField label="Tipo de negocio" required error={missing.has("businessType")} id="businessType" status={statusOf("businessType")}>
          <Select value={b.businessType} onChange={(e) => set({ businessType: e.target.value })}>
            <option value="">Elegí</option>
            {BUSINESS_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </HelpField>
        <HelpField label="Modelo de negocio">
          <Select value={b.businessModel} onChange={(e) => set({ businessModel: e.target.value as any })}>
            <option value="B2C">Le vendo a personas (B2C)</option>
            <option value="B2B">Le vendo a empresas (B2B)</option>
            <option value="Ambos">A ambos</option>
          </Select>
        </HelpField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <HelpField label="Año de fundación">
          <Select value={b.yearFounded} onChange={(e) => set({ yearFounded: e.target.value })}>
            {foundingYearOptions(CURRENT_YEAR).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </HelpField>
        <HelpField label="Cantidad de empleados">
          <Select value={b.employees} onChange={(e) => set({ employees: e.target.value })}>
            <option value="">Elegí</option>
            {["Solo yo", "1-10", "11-50", "51-200", "200+"].map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </Select>
        </HelpField>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <HelpField label="País" required error={missing.has("country")} id="country" status={statusOf("country")}>
          <SearchableCountrySelect
            value={b.country}
            onChange={(v) => set({ country: v, state: "" })}
            error={missing.has("country")}
          />
        </HelpField>
        <HelpField label="Provincia / Estado">
          <SearchableRegionSelect country={b.country} value={b.state} onChange={(v) => set({ state: v })} />
        </HelpField>
        <HelpField label="Ciudad">
          <Input value={b.city} onChange={(e) => set({ city: e.target.value })} placeholder="Buenos Aires" />
        </HelpField>
      </div>
    </Card>
  );
}

// ── Paso 2: Marca ────────────────────────────────────────────
function StepBrand({
  b,
  set,
  missing,
  statusOf,
}: {
  b: Business;
  set: (p: Partial<Business>) => void;
  missing: Set<string>;
  statusOf: (f: string) => FieldStatusKind | undefined;
}) {
  const suggest = (field: "shortDescription" | "fullDescription") =>
    set({ [field]: getFieldExample(field, b.industry) } as any);

  const activitiesHasOther = b.marketingActivities.includes("Otro");
  const seasonalityHasOther = b.seasonalityTags.includes("Otra");
  const datesHasOther = b.specialDates.includes("Otra");

  return (
    <Card className="space-y-5">
      <HelpField
        label="Descripción corta"
        required
        error={missing.has("shortDescription")}
        id="shortDescription"
        status={statusOf("shortDescription")}
        hint={`${b.shortDescription.length}/280`}
      >
        <div className="space-y-2">
          <Textarea
            maxLength={280}
            value={b.shortDescription}
            onChange={(e) => set({ shortDescription: e.target.value })}
            placeholder={getFieldExample("shortDescription", b.industry)}
          />
          <EvaSuggestionButton label="Que Eva lo sugiera" onClick={() => suggest("shortDescription")} />
        </div>
      </HelpField>

      <HelpField label="Descripción completa" help="Mientras más claro seas, mejores contenidos va a generar Eva." status={statusOf("fullDescription")}>
        <div className="space-y-2">
          <Textarea
            value={b.fullDescription}
            onChange={(e) => set({ fullDescription: e.target.value })}
            placeholder={getFieldExample("fullDescription", b.industry)}
          />
          <EvaSuggestionButton label="Que Eva lo sugiera" onClick={() => suggest("fullDescription")} />
        </div>
      </HelpField>

      <HelpField label="Valores de marca (hasta 5)">
        <ChipSelect options={VALUE_SUGGESTIONS} value={b.values} onChange={(v) => set({ values: v.slice(0, 5) })} allowCustom />
      </HelpField>

      <HelpField
        label="Ventaja competitiva"
        required
        error={missing.has("competitiveAdvantages")}
        id="competitiveAdvantages"
        status={statusOf("competitiveAdvantages")}
        help={getFieldExample("competitiveAdvantage", b.industry)}
      >
        <ChipSelect
          options={ADVANTAGE_SUGGESTIONS}
          value={b.competitiveAdvantages}
          onChange={(v) => set({ competitiveAdvantages: v })}
          allowCustom
        />
      </HelpField>

      <HelpField
        label="Canales actuales"
        required
        error={missing.has("marketingChannels")}
        id="marketingChannels"
        status={statusOf("marketingChannels")}
        help="¿Dónde está hoy tu negocio? Elegí los que uses (o “Ninguno”)."
      >
        <ChannelSelector value={b.marketingChannels} onChange={(v) => set({ marketingChannels: v })} />
      </HelpField>

      <HelpField
        label="¿Qué venís haciendo de marketing?"
        required
        error={missing.has("marketingActivities")}
        id="marketingActivities"
        help="Elegí todo lo que apliquen. Si no hacés nada todavía, está perfecto."
      >
        <OptionCards
          multi
          columns={2}
          options={MARKETING_ACTIVITIES.map((a) => ({ value: a, label: a }))}
          value={b.marketingActivities}
          onChange={(v) => set({ marketingActivities: v })}
        />
        {activitiesHasOther && (
          <Input
            className="mt-2"
            value={b.marketingStrategy}
            onChange={(e) => set({ marketingStrategy: e.target.value })}
            placeholder="Contanos qué otra cosa hacés…"
          />
        )}
      </HelpField>

      <HelpField label="¿Tu negocio tiene temporadas fuertes?" required error={missing.has("hasSeasonality")} id="hasSeasonality">
        <YesNoChoice value={b.hasSeasonality} onChange={(v) => set({ hasSeasonality: v })} />
        {b.hasSeasonality && (
          <div className="mt-3">
            <OptionCards
              multi
              columns={3}
              options={SEASONALITY_OPTIONS.map((s) => ({ value: s, label: s }))}
              value={b.seasonalityTags}
              onChange={(v) => set({ seasonalityTags: v })}
            />
            {seasonalityHasOther && (
              <Input
                className="mt-2"
                value={b.seasonality}
                onChange={(e) => set({ seasonality: e.target.value })}
                placeholder="¿Qué otra temporada?"
              />
            )}
          </div>
        )}
      </HelpField>

      <HelpField label="¿Hay fechas especiales importantes para tu negocio?" required error={missing.has("hasSpecialDates")} id="hasSpecialDates">
        <YesNoChoice value={b.hasSpecialDates} onChange={(v) => set({ hasSpecialDates: v })} />
        {b.hasSpecialDates && (
          <div className="mt-3">
            <OptionCards
              multi
              columns={2}
              options={SPECIAL_DATES_OPTIONS.map((s) => ({ value: s, label: s }))}
              value={b.specialDates}
              onChange={(v) => set({ specialDates: v })}
            />
            {datesHasOther && (
              <Input
                className="mt-2"
                value={b.seasonality}
                onChange={(e) => set({ seasonality: e.target.value })}
                placeholder="¿Qué otra fecha?"
              />
            )}
          </div>
        )}
      </HelpField>
    </Card>
  );
}

// ── Paso 3: Productos / Servicios ────────────────────────────
function emptyPS(type: ProductServiceType): ProductService {
  return {
    id: uid("ps"),
    type,
    name: "",
    category: "",
    subcategory: "",
    shortDescription: "",
    longDescription: "",
    features: [],
    variants: [],
    pricingType: "fijo",
    currency: "ARS",
    priceMin: undefined,
    priceMax: undefined,
    imageCaption: "",
    keywords: [],
    negativeKeywords: [],
    isTopSeller: false,
    saved: false,
    importSource: "manual",
  };
}

function StepProducts({
  b,
  set,
  show,
}: {
  b: Business;
  set: (p: Partial<Business>) => void;
  show: (m: string) => void;
}) {
  const items = b.productsServices;
  const [editingId, setEditingId] = useState<string | null>(null);

  const update = (id: string, patch: Partial<ProductService>) =>
    set({ productsServices: items.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  const remove = (id: string) => {
    set({ productsServices: items.filter((x) => x.id !== id) });
    if (editingId === id) setEditingId(null);
  };
  const add = (type: ProductServiceType) => {
    const ps = emptyPS(type);
    set({ productsServices: [...items, ps] });
    setEditingId(ps.id);
  };
  const save = (id: string) => {
    update(id, { saved: true });
    setEditingId(null);
    show("Guardado ✓");
  };

  return (
    <div className="space-y-4">
      <p className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-500">
        No hace falta cargar todo tu catálogo. Empezá por tus productos o servicios más importantes.
      </p>

      <ProductServiceImporter
        onImport={(imported) => {
          set({ productsServices: [...items, ...imported] });
          show(`Eva detectó ${imported.length} ítems. Podés editarlos antes de seguir.`);
        }}
      />

      {items.map((ps) =>
        ps.saved && editingId !== ps.id ? (
          <ProductServiceCard
            key={ps.id}
            ps={ps}
            onEdit={() => setEditingId(ps.id)}
            onRemove={() => remove(ps.id)}
          />
        ) : (
          <ProductServiceForm
            key={ps.id}
            business={b}
            ps={ps}
            onChange={(patch) => update(ps.id, patch)}
            onSave={() => save(ps.id)}
            onRemove={() => remove(ps.id)}
            onToast={show}
          />
        )
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => add("producto")}>
          <Plus className="h-4 w-4" /> Agregar {items.length ? "otro " : ""}producto
        </Button>
        <Button size="sm" variant="outline" onClick={() => add("servicio")}>
          <Plus className="h-4 w-4" /> Agregar {items.length ? "otro " : ""}servicio
        </Button>
      </div>
    </div>
  );
}

// ── Paso 4: Audiencia ────────────────────────────────────────
function StepAudience({
  b,
  set,
  missing,
}: {
  b: Business;
  set: (p: Partial<Business>) => void;
  missing: Set<string>;
}) {
  const a = b.audience;
  const setA = (patch: Partial<Business["audience"]>) => set({ audience: { ...a, ...patch } });
  return (
    <Card className="space-y-5">
      <HelpField label="Rango de edad" required error={missing.has("ageRanges")} id="ageRanges">
        <ChipSelect options={AGE_RANGES} value={a.ageRanges} onChange={(v) => setA({ ageRanges: v })} />
      </HelpField>

      <div className="grid gap-4 sm:grid-cols-2">
        <HelpField label="Género">
          <OptionCards
            columns={2}
            options={GENDER_OPTIONS}
            value={a.gender}
            onChange={(v) => setA({ gender: v })}
          />
        </HelpField>
        <HelpField label="Nivel socioeconómico">
          <Select value={a.socioeconomicLevel} onChange={(e) => setA({ socioeconomicLevel: e.target.value as any })}>
            <option value="alto">Alto</option>
            <option value="medio_alto">Medio-alto</option>
            <option value="medio">Medio</option>
            <option value="bajo">Bajo</option>
          </Select>
        </HelpField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <HelpField label="¿Dónde está tu cliente?">
          <Select value={a.locationLogic} onChange={(e) => setA({ locationLogic: e.target.value as any })}>
            <option value="ciudad">En mi ciudad</option>
            <option value="pais">En todo el país</option>
            <option value="regional">En la región</option>
            <option value="global">En todo el mundo</option>
          </Select>
        </HelpField>
        <HelpField label="Ubicaciones objetivo">
          <ChipSelect options={[]} value={a.locations} onChange={(v) => setA({ locations: v })} allowCustom />
        </HelpField>
      </div>

      <HelpField label="¿Qué problema le resolvés?" help={getFieldExample("painPoint", b.industry)}>
        <ChipSelect options={[]} value={a.painPoints} onChange={(v) => setA({ painPoints: v })} allowCustom />
      </HelpField>

      <HelpField label="¿Cómo se comporta tu cliente?">
        <Textarea
          value={a.behavior}
          onChange={(e) => setA({ behavior: e.target.value })}
          placeholder={getFieldExample("behavior", b.industry)}
        />
      </HelpField>

      <HelpField label="Segmentos de audiencia">
        <ChipSelect options={[]} value={a.segments} onChange={(v) => setA({ segments: v })} allowCustom />
      </HelpField>
    </Card>
  );
}

// ── Paso 5: Objetivos ────────────────────────────────────────
function StepGoals({
  b,
  set,
  missing,
}: {
  b: Business;
  set: (p: Partial<Business>) => void;
  missing: Set<string>;
}) {
  const g = b.goals;
  const setG = (patch: Partial<Business["goals"]>) => set({ goals: { ...g, ...patch } });
  return (
    <Card className="space-y-5">
      <HelpField label="¿Qué buscás principalmente?" required error={missing.has("primaryContentGoal")} id="primaryContentGoal">
        <OptionCards
          columns={3}
          options={[
            { value: "visibilidad", label: "Visibilidad", desc: "Que me conozcan más" },
            { value: "ventas", label: "Ventas", desc: "Vender más" },
            { value: "confianza", label: "Confianza", desc: "Que confíen en mí" },
          ]}
          value={g.primaryContentGoal}
          onChange={(v) => setG({ primaryContentGoal: v })}
        />
      </HelpField>

      {g.primaryContentGoal === "ventas" && (
        <HelpField label="¿Qué tipo de venta?">
          <OptionCards
            columns={2}
            options={[
              { value: "compra_ecommerce", label: "Compra online" },
              { value: "mensaje_whatsapp", label: "Mensaje / WhatsApp" },
              { value: "visita_local", label: "Visita al local" },
              { value: "lead_magnet", label: "Conseguir contactos (leads)" },
            ]}
            value={g.salesGoalType || ""}
            onChange={(v) => setG({ salesGoalType: v })}
          />
        </HelpField>
      )}

      <HelpField label="¿Qué querés lograr con tu negocio?">
        <Textarea
          value={g.businessObjectives}
          onChange={(e) => setG({ businessObjectives: e.target.value })}
          placeholder={getFieldExample("businessObjectives", b.industry)}
        />
      </HelpField>

      <HelpField label="¿Cómo vas a medir el éxito?">
        <ChipSelect
          options={["Ventas", "Alcance", "Seguidores", "Visitas al local", "Mensajes", "Conversión"]}
          value={g.successMetrics}
          onChange={(v) => setG({ successMetrics: v })}
          allowCustom
        />
      </HelpField>

      <HelpField label="¿Qué querés lograr con tu marketing?">
        <Textarea
          value={g.marketingObjectives}
          onChange={(e) => setG({ marketingObjectives: e.target.value })}
          placeholder={getFieldExample("marketingObjectives", b.industry)}
        />
      </HelpField>

      <HelpField label="¿En cuánto tiempo?" required error={missing.has("timeline")} id="timeline">
        <Select value={g.timeline} onChange={(e) => setG({ timeline: e.target.value })}>
          <option value="">Elegí</option>
          <option value="Próximo mes">Próximo mes</option>
          <option value="Próximos 3 meses">Próximos 3 meses</option>
          <option value="Próximos 6 meses">Próximos 6 meses</option>
          <option value="Este año">Este año</option>
        </Select>
      </HelpField>
    </Card>
  );
}
