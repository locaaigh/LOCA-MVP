import type { Metadata } from "next";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { CtaButtons, SectionHeading, FinalCta } from "@/components/marketing/pieces";
import { STEPS } from "@/lib/marketing/config";

export const metadata: Metadata = {
  title: "Cómo funciona LOCA — Marketing con IA en 3 pasos",
  description:
    "Contale a Eva de tu negocio, revisá lo que arma y aprobá. LOCA genera tu estrategia, tus contenidos y tu calendario, y publica en Instagram y Facebook por vos.",
};

const DETAIL: Record<string, string[]> = {
  "1": [
    "Pegá el link de tu web y Eva la lee sola.",
    "O subí un resumen de tu negocio (incluso uno hecho con ChatGPT o Claude).",
    "¿No tenés nada a mano? Completás 5 minutos de preguntas simples.",
  ],
  "2": [
    "Estrategia: posicionamiento, público, pilares de contenido y tono de voz.",
    "Contenidos: copies, ideas y CTAs listos, con las fechas especiales de tu rubro.",
    "Calendario: el mes entero organizado, con los mejores horarios para publicar.",
  ],
  "3": [
    "Conectás tu Instagram y Facebook en un par de clics.",
    "Revisás cada contenido y pedís cambios por chat si querés.",
    "Aprobás y Eva publica sola, en el momento indicado.",
  ],
};

export default function ComoFuncionaPage() {
  return (
    <main className="min-h-screen">
      <SiteNav />

      <section className="loca-hero-bg">
        <div className="mx-auto max-w-3xl px-5 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">Cómo funciona</p>
          <h1 className="mx-auto mt-3 text-balance text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">
            De tu negocio a publicado, en 3 pasos.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-muted-foreground-2">
            Sin briefs eternos ni reuniones. Le contás a Eva quién sos una vez y el marketing empieza a correr solo.
          </p>
          <CtaButtons className="mt-9" />
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-20 sm:px-6">
        <div className="space-y-8">
          {STEPS.map((s) => (
            <div key={s.n} className="loca-card flex flex-col gap-6 p-8 sm:flex-row sm:items-start">
              <div className="flex shrink-0 items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lima-400 text-2xl font-bold text-ink shadow-glow-lima">
                  {s.n}
                </div>
                <s.icon className="h-6 w-6 text-accent sm:hidden" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold tracking-tight text-foreground">{s.title}</h2>
                  <s.icon className="hidden h-5 w-5 text-accent sm:block" />
                </div>
                <p className="mt-1.5 text-[15px] text-muted-foreground-2">{s.desc}</p>
                <ul className="mt-4 space-y-2">
                  {DETAIL[s.n]?.map((d) => (
                    <li key={d} className="flex items-start gap-2.5 text-sm text-foreground-soft">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border/60 bg-surface-subtle/60 py-20">
        <div className="mx-auto max-w-3xl px-5 text-center sm:px-6">
          <SectionHeading
            title="¿Cuánto tarda?"
            subtitle="Cargar tu negocio te lleva unos minutos. Eva arma tu primera tanda de estrategia y contenidos mientras tomás un café. Después, cada mes se repite solo."
          />
        </div>
      </section>

      <FinalCta title="Probalo con tu negocio" subtitle="Vas a ver tu estrategia y tus primeros contenidos en minutos." />
      <SiteFooter />
    </main>
  );
}
