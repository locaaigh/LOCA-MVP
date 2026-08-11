import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { EvaAvatar } from "@/components/brand";
import { appHref, PLANS, COMPARISON, FAQ, TESTIMONIALS } from "@/lib/marketing/config";

/** Botonera de CTA reutilizable (primario a la app, secundario a la demo). */
export function CtaButtons({
  primaryLabel = "Crear mi marketing",
  className = "",
}: {
  primaryLabel?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 sm:flex-row ${className}`}>
      {/* data-ph-capture-attribute-cta: PostHog autocapture guarda "cta" como
          propiedad del click — identifica cada CTA sin instrumentar a mano. */}
      <a
        href={appHref("/onboarding")}
        data-ph-capture-attribute-cta="hero-onboarding"
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-loca-600 px-8 py-4 text-base font-semibold text-white shadow-lift transition-all duration-150 hover:bg-loca-700 hover:shadow-glow active:scale-[0.98] sm:w-auto"
      >
        {primaryLabel} <ArrowRight className="h-4 w-4" />
      </a>
      <a
        href={appHref("/demo")}
        data-ph-capture-attribute-cta="hero-demo"
        className="inline-flex w-full items-center justify-center rounded-2xl border border-border bg-card/80 px-8 py-4 text-base font-semibold text-foreground-soft backdrop-blur transition hover:border-border-strong hover:bg-card sm:w-auto"
      >
        Ver la demo
      </a>
    </div>
  );
}

/** Encabezado de sección: eyebrow opcional + título + subtítulo. */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={`mx-auto max-w-2xl text-center ${className}`}>
      {eyebrow && (
        <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">{eyebrow}</p>
      )}
      <h2 className="mt-2 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      {subtitle && <p className="mt-4 text-balance text-lg text-muted-foreground-2">{subtitle}</p>}
    </div>
  );
}

/** Cards de planes. */
export function PricingCards() {
  return (
    <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2">
      {PLANS.map((p) => (
        <div
          key={p.id}
          className={
            p.highlight
              ? "relative flex flex-col rounded-[1.75rem] border-2 border-loca-400 bg-card p-8 shadow-pop"
              : "relative flex flex-col rounded-[1.75rem] border border-border/60 bg-card p-8 shadow-card"
          }
        >
          {p.highlight && (
            <span className="absolute -top-3 left-8 rounded-full bg-lima-400 px-3 py-1 text-xs font-bold text-ink shadow-glow-lima">
              Más elegido
            </span>
          )}
          <h3 className="text-lg font-bold text-foreground">{p.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>
          <div className="mt-5 flex items-baseline gap-1">
            <span className="text-4xl font-extrabold tracking-tight text-foreground">{p.price}</span>
            {p.period && <span className="text-sm text-muted-foreground">{p.period}</span>}
          </div>
          <ul className="mt-6 flex-1 space-y-3">
            {p.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-foreground-soft">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          {p.cta.external ? (
            <a
              href={p.cta.href}
              data-ph-capture-attribute-cta={`pricing-${p.id}`}
              className={
                p.highlight
                  ? "mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-loca-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lift transition hover:bg-loca-700"
                  : "mt-8 inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-6 py-3.5 text-sm font-semibold text-foreground-soft transition hover:border-border-strong hover:bg-surface-subtle"
              }
            >
              {p.cta.label} <ArrowRight className="h-4 w-4" />
            </a>
          ) : (
            <Link
              href={p.cta.href}
              data-ph-capture-attribute-cta={`pricing-${p.id}`}
              className={
                p.highlight
                  ? "mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-loca-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lift transition hover:bg-loca-700"
                  : "mt-8 inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-6 py-3.5 text-sm font-semibold text-foreground-soft transition hover:border-border-strong hover:bg-surface-subtle"
              }
            >
              {p.cta.label} <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}

/** Tabla comparativa vs agencia / freelancers / hacerlo solo. */
export function ComparisonTable() {
  const lastCol = COMPARISON.cols.length - 1;
  return (
    <div className="mx-auto max-w-3xl overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {COMPARISON.cols.map((c, i) => (
              <th
                key={c || "row-label"}
                className={
                  i === lastCol
                    ? "rounded-t-2xl bg-accent-subtle-bg px-4 py-3 text-center font-bold text-accent-subtle-fg"
                    : "px-4 py-3 text-center font-semibold text-muted-foreground"
                }
              >
                {i === lastCol ? "LOCA" : c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARISON.rows.map((row) => (
            <tr key={row[0]} className="border-t border-border/60">
              {row.map((cell, i) => (
                <td
                  key={i}
                  className={
                    i === 0
                      ? "px-4 py-3.5 text-left font-medium text-foreground-soft"
                      : i === lastCol
                        ? "bg-accent-subtle-bg/50 px-4 py-3.5 text-center font-semibold text-accent-subtle-fg"
                        : "px-4 py-3.5 text-center text-muted-foreground-2"
                  }
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Testimonios (placeholders inventados por ahora). */
export function Testimonials() {
  return (
    <div className="grid gap-5 sm:grid-cols-3">
      {TESTIMONIALS.map((t) => (
        <figure key={t.name} className="loca-card flex flex-col p-6">
          <blockquote className="flex-1 text-[15px] leading-relaxed text-foreground-soft">
            “{t.quote}”
          </blockquote>
          <figcaption className="mt-5 flex items-center gap-3">
            <EvaAvatar size={38} />
            <div>
              <p className="text-sm font-semibold text-foreground">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.role}</p>
            </div>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

/** FAQ con acordeón nativo (<details>), sin JS. */
export function FaqList() {
  return (
    <div className="mx-auto max-w-2xl divide-y divide-border/60 rounded-[1.75rem] border border-border/60 bg-card">
      {FAQ.map((f) => (
        <details key={f.q} className="group px-6 py-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-foreground">
            {f.q}
            <span className="text-accent transition group-open:rotate-45">+</span>
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground-2">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

/** Banda de CTA final. */
export function FinalCta({
  title = "Tu marketing, resuelto.",
  subtitle = "Contale a Eva de tu negocio y mirá lo que arma en minutos.",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <section className="mx-auto max-w-5xl px-5 pb-20 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-loca-600 to-loca-800 px-8 py-14 text-center text-white shadow-pop">
        <span className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
        <p className="mx-auto mt-3 max-w-xl text-balance text-loca-100">{subtitle}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={appHref("/onboarding")}
            data-ph-capture-attribute-cta="final-onboarding"
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-semibold text-loca-700 shadow-lift transition hover:bg-loca-50 active:scale-[0.98] sm:w-auto"
          >
            Crear mi marketing <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href={appHref("/demo")}
            data-ph-capture-attribute-cta="final-demo"
            className="inline-flex w-full items-center justify-center rounded-2xl border border-white/30 px-8 py-4 text-base font-semibold text-white transition hover:bg-white/10 sm:w-auto"
          >
            Ver la demo
          </a>
        </div>
      </div>
    </section>
  );
}
