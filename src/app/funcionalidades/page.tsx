import type { Metadata } from "next";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { CtaButtons, SectionHeading, FinalCta } from "@/components/marketing/pieces";
import { FEATURES } from "@/lib/marketing/config";

export const metadata: Metadata = {
  title: "Funcionalidades de LOCA — Estrategia, contenidos y publicación con IA",
  description:
    "Estrategia a medida, generación de contenidos, calendario inteligente, publicación automática en Instagram y Facebook, brand kit, chat con Eva y métricas. Todo en un solo lugar.",
};

export default function FuncionalidadesPage() {
  return (
    <main className="min-h-screen">
      <SiteNav />

      <section className="loca-hero-bg">
        <div className="mx-auto max-w-3xl px-5 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">Funcionalidades</p>
          <h1 className="mx-auto mt-3 text-balance text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">
            Una agencia entera, en una sola app.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-muted-foreground-2">
            Todo lo que necesitás para que tu marketing funcione, conectado y trabajando junto. Sin saltar entre diez herramientas.
          </p>
          <CtaButtons className="mt-9" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="loca-card p-8 transition hover:shadow-lift">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-subtle-bg text-accent">
                <f.icon className="h-6 w-6" />
              </div>
              <h2 className="mt-5 text-lg font-semibold text-foreground">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground-2">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border/60 bg-surface-subtle/60 py-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-6">
          <SectionHeading
            title="Vos siempre tenés el control"
            subtitle="Eva propone y ejecuta, pero nada se publica sin tu aprobación. Editás lo que quieras, le pedís cambios por chat y aprobás con un clic."
          />
        </div>
      </section>

      <FinalCta />
      <SiteFooter />
    </main>
  );
}
