import Link from "next/link";
import { Logo } from "@/components/brand";
import { NAV_LINKS, appHref, SUPPORT_EMAIL } from "@/lib/marketing/config";
import { INDUSTRIES } from "@/lib/marketing/industries";

/** Footer de la web de marketing, con navegación, rubros y links legales. */
export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border/60 bg-surface-subtle/50">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo className="text-2xl" />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Tu agencia de marketing con IA. Eva crea tu estrategia, tus contenidos y tu calendario, y publica por vos.
            </p>
          </div>

          <FooterCol title="Producto">
            {NAV_LINKS.map((l) => (
              <FooterLink key={l.href} href={l.href}>
                {l.label}
              </FooterLink>
            ))}
            <FooterLink href="/contacto">Contacto</FooterLink>
          </FooterCol>

          <FooterCol title="Para tu negocio">
            {INDUSTRIES.map((i) => (
              <FooterLink key={i.slug} href={`/para/${i.slug}`}>
                {i.segment}
              </FooterLink>
            ))}
          </FooterCol>

          <FooterCol title="Empezar">
            <FooterLink href={appHref("/onboarding")}>Crear mi marketing</FooterLink>
            <FooterLink href={appHref("/login")}>Iniciar sesión</FooterLink>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="block text-sm text-muted-foreground transition hover:text-foreground"
            >
              {SUPPORT_EMAIL}
            </a>
          </FooterCol>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border/60 pt-6 text-sm text-faint sm:flex-row sm:items-center">
          <p>© {year} LOCA · Operado por INFINIDAD S.R.L.</p>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/legal/privacy" className="transition hover:text-foreground">
              Privacidad
            </Link>
            <Link href="/legal/terms" className="transition hover:text-foreground">
              Términos
            </Link>
            <Link href="/legal/meta-data-deletion" className="transition hover:text-foreground">
              Eliminación de datos
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="mt-3 flex flex-col gap-2">{children}</div>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm text-muted-foreground transition hover:text-foreground">
      {children}
    </Link>
  );
}
