import type { Metadata } from "next";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ContactForm } from "@/components/marketing/contact-form";

export const metadata: Metadata = {
  title: "Contacto — LOCA para empresas y agencias",
  description:
    "¿Necesitás mayor volumen o gestionás varias marcas? Contanos qué necesitás y armamos un plan Enterprise a tu medida.",
};

export default function ContactoPage() {
  return (
    <main className="min-h-screen">
      <SiteNav />

      <section className="loca-hero-bg">
        <div className="mx-auto max-w-2xl px-5 pb-10 pt-16 text-center sm:px-6 sm:pt-24">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">Enterprise / Agencias</p>
          <h1 className="mx-auto mt-3 text-balance text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Hablemos de tu volumen.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-muted-foreground-2">
            Si necesitás más contenidos, manejás varias marcas o sos una agencia, armamos un plan a tu medida.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-5 pb-24 sm:px-6">
        <ContactForm />
      </section>

      <SiteFooter />
    </main>
  );
}
