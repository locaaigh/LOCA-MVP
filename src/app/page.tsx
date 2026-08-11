import Link from "next/link";
import type { Metadata } from "next";
import { Sparkles, ArrowRight, Check } from "lucide-react";
import { EvaAvatar } from "@/components/brand";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import {
  CtaButtons,
  SectionHeading,
  PricingCards,
  ComparisonTable,
  Testimonials,
  FaqList,
  FinalCta,
} from "@/components/marketing/pieces";
import { BENEFITS, PAINS, STEPS, FEATURES } from "@/lib/marketing/config";
import { INDUSTRIES } from "@/lib/marketing/industries";

export const metadata: Metadata = {
  title: "LOCA — Tu agencia de marketing con IA",
  description:
    "Eva crea tu estrategia, diseña tus contenidos y arma tu calendario. Vos aprobás, ella publica en Instagram y Facebook. Todo en minutos, por una fracción del costo de una agencia.",
};

export default function Home() {
  return (
    <main className="min-h-screen">
      <SiteNav />

      {/* Hero */}
      <section className="loca-hero-bg relative overflow-hidden">
        <div className="mx-auto max-w-3xl px-5 pb-20 pt-16 text-center sm:px-6 sm:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-loca-100 bg-card/70 px-3.5 py-1.5 text-sm font-medium text-accent-subtle-fg shadow-sm backdrop-blur">
            <Sparkles className="h-4 w-4" /> Tu agencia de marketing con IA
          </span>
          <h1 className="mx-auto mt-7 text-balance text-5xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-7xl">
            Tu marketing, resuelto por IA.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-balance text-lg text-muted-foreground-2 sm:text-xl">
            <strong className="font-semibold text-accent-subtle-fg">Eva</strong> crea tu estrategia,
            diseña tus contenidos y arma tu calendario. Vos aprobás, ella publica. Todo en minutos, no en meses.
          </p>
          <CtaButtons className="mt-10" />
          <p className="mt-5 text-sm text-faint">Sin contratos. Cancelás cuando quieras. Sin saber de marketing.</p>
        </div>
      </section>

      {/* Beneficios "sin…" */}
      <section className="mx-auto max-w-5xl px-5 py-16 sm:px-6">
        <div className="grid gap-5 sm:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.title} className="loca-card p-6 transition hover:shadow-lift">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-subtle-bg text-accent">
                <Check className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">{b.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Problema */}
      <section className="border-y border-border/60 bg-surface-subtle/60 py-20">
        <div className="mx-auto max-w-4xl px-5 sm:px-6">
          <SectionHeading
            eyebrow="El problema"
            title="Tenés un negocio, no una agencia."
            subtitle="Y aun así el marketing no se hace solo. Hasta ahora."
          />
          <div className="mx-auto mt-10 grid max-w-2xl gap-3">
            {PAINS.map((p) => (
              <div key={p} className="flex items-start gap-3 rounded-2xl bg-card px-5 py-4 shadow-card">
                <span className="mt-0.5 text-lg leading-none text-accent">—</span>
                <p className="text-[15px] text-foreground-soft">{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solución / Eva + 3 pasos */}
      <section className="mx-auto max-w-5xl px-5 py-20 sm:px-6">
        <SectionHeading
          eyebrow="La solución"
          title="Conocé a Eva, tu equipo de marketing con IA"
          subtitle="Le contás de tu negocio una vez y ella se encarga del resto."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="loca-card p-7">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-lima-400 text-lg font-bold text-ink shadow-glow-lima">
                  {s.n}
                </div>
                <s.icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="mt-5 font-semibold text-foreground">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Funcionalidades */}
      <section className="border-y border-border/60 bg-surface-subtle/60 py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <SectionHeading eyebrow="Funcionalidades" title="Todo lo que Eva hace por vos" />
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-3xl border border-border/60 bg-card p-6 shadow-card transition hover:shadow-lift">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-subtle-bg text-accent">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-foreground">{f.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/funcionalidades" className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
              Ver todas las funcionalidades <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Cuánto ahorrás (comparativa) */}
      <section className="mx-auto max-w-5xl px-5 py-20 sm:px-6">
        <SectionHeading
          eyebrow="Cuánto ahorrás"
          title="LOCA vs. las alternativas"
          subtitle="El resultado de una agencia, el precio de una app."
        />
        <div className="mt-12">
          <ComparisonTable />
        </div>
      </section>

      {/* Rubros */}
      <section className="border-y border-border/60 bg-surface-subtle/60 py-20">
        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <SectionHeading
            eyebrow="Para tu negocio"
            title="Pensado para lo que hacés"
            subtitle="Eva adapta la estrategia y los contenidos a tu rubro."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {INDUSTRIES.map((i) => (
              <Link
                key={i.slug}
                href={`/para/${i.slug}`}
                className="group loca-card flex flex-col p-7 transition hover:shadow-lift"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-subtle-bg text-accent">
                  <i.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-foreground">{i.segment}</h3>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">{i.audience}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                  Ver cómo <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonios */}
      <section className="mx-auto max-w-5xl px-5 py-20 sm:px-6">
        <SectionHeading eyebrow="Historias" title="Negocios que ya no piensan en qué postear" />
        <div className="mt-12">
          <Testimonials />
        </div>
      </section>

      {/* Precios */}
      <section className="border-y border-border/60 bg-surface-subtle/60 py-20">
        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <SectionHeading
            eyebrow="Precios"
            title="Un precio simple. Sin sorpresas."
            subtitle="Empezás con 12 contenidos por mes. Cancelás cuando quieras."
          />
          <div className="mt-12">
            <PricingCards />
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/precios" className="font-semibold text-accent hover:underline">
              Ver todos los detalles de precios
            </Link>
          </p>
        </div>
      </section>

      {/* Eva strip */}
      <section className="mx-auto my-20 max-w-4xl px-5 sm:px-6">
        <div className="relative flex flex-col items-center gap-5 overflow-hidden rounded-3xl bg-gradient-to-br from-loca-600 to-loca-800 px-8 py-12 text-center text-white shadow-pop sm:flex-row sm:text-left">
          <span className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
          <EvaAvatar size={64} />
          <div className="relative">
            <h2 className="text-2xl font-bold tracking-tight">Eva arma tu marketing por vos</h2>
            <p className="mt-1.5 text-loca-100">Vos revisás y aprobás. Ella se encarga del resto, en minutos.</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-5xl px-5 pb-20 sm:px-6">
        <SectionHeading eyebrow="Preguntas" title="Lo que solés preguntar" />
        <div className="mt-12">
          <FaqList />
        </div>
      </section>

      <FinalCta />
      <SiteFooter />
    </main>
  );
}
