import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { EvaAvatar } from "@/components/brand";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { CtaButtons, PricingCards, FaqList, FinalCta } from "@/components/marketing/pieces";
import { INDUSTRIES, getIndustry } from "@/lib/marketing/industries";

export function generateStaticParams() {
  return INDUSTRIES.map((i) => ({ slug: i.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const ind = getIndustry(params.slug);
  if (!ind) return {};
  return { title: ind.metaTitle, description: ind.metaDescription };
}

export default function IndustryPage({ params }: { params: { slug: string } }) {
  const ind = getIndustry(params.slug);
  if (!ind) notFound();

  return (
    <main className="min-h-screen">
      <SiteNav />

      {/* Hero */}
      <section className="loca-hero-bg">
        <div className="mx-auto max-w-3xl px-5 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-loca-100 bg-card/70 px-3.5 py-1.5 text-sm font-medium text-accent-subtle-fg shadow-sm backdrop-blur">
            <ind.icon className="h-4 w-4" /> {ind.segment}
          </span>
          <h1 className="mx-auto mt-6 text-balance text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-6xl">
            {ind.h1}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-muted-foreground-2">{ind.sub}</p>
          <CtaButtons className="mt-9" />
        </div>
      </section>

      {/* Dolores */}
      <section className="mx-auto max-w-4xl px-5 py-20 sm:px-6">
        <h2 className="text-balance text-center text-3xl font-bold tracking-tight text-foreground">¿Te suena?</h2>
        <div className="mx-auto mt-10 grid max-w-2xl gap-3">
          {ind.pains.map((p) => (
            <div key={p} className="flex items-start gap-3 rounded-2xl bg-card px-5 py-4 shadow-card">
              <span className="mt-0.5 text-lg leading-none text-accent">—</span>
              <p className="text-[15px] text-foreground-soft">{p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Qué postearía Eva */}
      <section className="border-y border-border/60 bg-surface-subtle/60 py-20">
        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <h2 className="text-balance text-center text-3xl font-bold tracking-tight text-foreground">
            Lo que Eva publica para vos
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-balance text-center text-muted-foreground-2">
            Contenido pensado para {ind.segment.toLowerCase()}, listo para aprobar y publicar.
          </p>
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {ind.contentExamples.map((c) => (
              <div key={c.title} className="loca-card p-7">
                <h3 className="text-lg font-semibold text-foreground">{c.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground-2">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Resultados */}
      <section className="mx-auto max-w-4xl px-5 py-20 sm:px-6">
        <h2 className="text-balance text-center text-3xl font-bold tracking-tight text-foreground">El resultado</h2>
        <div className="mx-auto mt-10 grid max-w-2xl gap-3">
          {ind.outcomes.map((o) => (
            <div key={o} className="flex items-start gap-3 rounded-2xl bg-card px-5 py-4 shadow-card">
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <p className="text-[15px] text-foreground-soft">{o}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonio */}
      <section className="mx-auto max-w-3xl px-5 pb-20 sm:px-6">
        <figure className="loca-card p-8 text-center">
          <blockquote className="text-balance text-xl font-medium leading-relaxed text-foreground-soft">
            “{ind.testimonial.quote}”
          </blockquote>
          <figcaption className="mt-6 flex items-center justify-center gap-3">
            <EvaAvatar size={40} />
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">{ind.testimonial.name}</p>
              <p className="text-xs text-muted-foreground">{ind.testimonial.role}</p>
            </div>
          </figcaption>
        </figure>
      </section>

      {/* Precios */}
      <section className="border-y border-border/60 bg-surface-subtle/60 py-20">
        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <h2 className="text-balance text-center text-3xl font-bold tracking-tight text-foreground">
            Un precio simple, sin agencia
          </h2>
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

      {/* FAQ */}
      <section className="mx-auto max-w-5xl px-5 py-20 sm:px-6">
        <h2 className="text-balance text-center text-3xl font-bold tracking-tight text-foreground">Preguntas frecuentes</h2>
        <div className="mt-12">
          <FaqList />
        </div>
        <div className="mt-12 flex items-center justify-center gap-1.5 text-sm">
          <span className="text-muted-foreground">¿Otro rubro?</span>
          <Link href="/" className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">
            Ver todos <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <FinalCta />
      <SiteFooter />
    </main>
  );
}
