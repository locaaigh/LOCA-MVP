import type { Metadata } from "next";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import {
  SectionHeading,
  PricingCards,
  ComparisonTable,
  FaqList,
  FinalCta,
} from "@/components/marketing/pieces";

export const metadata: Metadata = {
  title: "Precios de LOCA — Marketing con IA desde USD 89/mes",
  description:
    "12 contenidos por mes por USD 89, con estrategia, calendario y publicación automática incluidos. Plan Enterprise para mayor volumen y agencias. Sin contratos.",
};

export default function PreciosPage() {
  return (
    <main className="min-h-screen">
      <SiteNav />

      <section className="loca-hero-bg">
        <div className="mx-auto max-w-3xl px-5 pb-14 pt-16 text-center sm:px-6 sm:pt-24">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">Precios</p>
          <h1 className="mx-auto mt-3 text-balance text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">
            Un precio simple. Sin sorpresas.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-muted-foreground-2">
            Pagás una fracción de lo que cuesta una agencia y tenés todo incluido: estrategia, contenidos, calendario y publicación.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-8 pt-4 sm:px-6">
        <PricingCards />
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Estamos preparando más planes. Por ahora, empezás con Contenidos y escalás a Enterprise cuando lo necesites.
        </p>
      </section>

      <section className="border-y border-border/60 bg-surface-subtle/60 py-20">
        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <SectionHeading
            eyebrow="Comparativa"
            title="Lo que pagarías de otra forma"
            subtitle="El resultado de una agencia, el precio de una app."
          />
          <div className="mt-12">
            <ComparisonTable />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-20 sm:px-6">
        <SectionHeading eyebrow="Preguntas" title="Dudas sobre precios y planes" />
        <div className="mt-12">
          <FaqList />
        </div>
      </section>

      <FinalCta title="Empezá hoy" subtitle="Creá tu cuenta, cargá tu negocio y mirá tu estrategia antes de pagar nada." />
      <SiteFooter />
    </main>
  );
}
