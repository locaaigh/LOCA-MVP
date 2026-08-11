import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos y Condiciones — LOCA",
  description: "Términos y condiciones de uso del servicio LOCA.",
};

/**
 * Página pública de Términos y Condiciones. Requerida por Meta (Terms of Service
 * URL) y por LinkedIn/Stripe. Registrar en Meta Console: {dominio}/legal/terms
 *
 * NOTA LEGAL: borrador operativo. Antes de publicar en producción, que lo revise
 * un asesor legal (defensa del consumidor, pagos, propiedad intelectual).
 */
export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm font-bold uppercase tracking-wider text-accent">LOCA</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Términos y Condiciones</h1>
      <p className="mt-2 text-sm text-faint">Última actualización: agosto de 2026</p>

      <p className="mt-6 text-muted-foreground-2">
        Estos Términos y Condiciones (los “Términos”) regulan el uso de LOCA, una herramienta de marketing con
        inteligencia artificial operada por <strong>INFINIDAD S.R.L.</strong> (CUIT 30-71581900-3), con domicilio
        en <strong>Condarco 3145, Ciudad Autónoma de Buenos Aires, Argentina</strong> (“LOCA”, “nosotros”). Al
        crear una cuenta o usar LOCA aceptás estos Términos. Si no estás de acuerdo, no uses el servicio.
      </p>

      <Section title="1. El servicio">
        <p className="mt-3 text-muted-foreground-2">
          LOCA ayuda a negocios a generar estrategia y contenido de marketing con IA (textos e imágenes) y,
          opcionalmente, a programarlo y publicarlo en sus redes sociales conectadas. LOCA es una herramienta de
          asistencia: vos revisás, editás y aprobás el contenido antes de usarlo o publicarlo.
        </p>
      </Section>

      <Section title="2. Tu cuenta">
        <p className="mt-3 text-muted-foreground-2">
          Para usar LOCA necesitás una cuenta. Sos responsable de la veracidad de tus datos, de mantener la
          seguridad de tu acceso y de toda la actividad realizada desde tu cuenta. Debés ser mayor de edad y tener
          capacidad legal para contratar. LOCA está dirigido a negocios y profesionales.
        </p>
      </Section>

      <Section title="3. Uso aceptable">
        <p className="mt-3 text-muted-foreground-2">No podés usar LOCA para:</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground-2">
          <li>Generar o publicar contenido ilegal, engañoso, difamatorio, que infrinja derechos de terceros o que viole las políticas de las plataformas de redes sociales.</li>
          <li>Suplantar identidades o hacerte pasar por otra persona o marca.</li>
          <li>Vulnerar la seguridad del servicio, hacer ingeniería inversa o usarlo de forma automatizada abusiva.</li>
          <li>Cargar datos personales de terceros sin base legal para hacerlo.</li>
        </ul>
      </Section>

      <Section title="4. Contenido generado con IA">
        <p className="mt-3 text-muted-foreground-2">
          El contenido que genera LOCA se produce con modelos de inteligencia artificial y puede contener errores,
          imprecisiones o afirmaciones no verificadas. <strong>Vos sos responsable de revisar, editar y aprobar</strong>{" "}
          todo el contenido antes de publicarlo o utilizarlo. LOCA no garantiza resultados comerciales (ventas,
          alcance, seguidores) ni la exactitud del contenido generado. Entre vos y LOCA, el contenido final que
          aprobás es tuyo; nos otorgás una licencia limitada para procesarlo y prestarte el servicio.
        </p>
      </Section>

      <Section title="5. Conexión y publicación en redes sociales">
        <p className="mt-3 text-muted-foreground-2">
          Si conectás tus cuentas de Instagram, Facebook (o, en el futuro, LinkedIn), nos autorizás a publicar en
          tu nombre el contenido que vos apruebes. Sos responsable de cumplir con los términos y políticas de cada
          plataforma. Podés desconectar tus cuentas en cualquier momento. LOCA no se responsabiliza por cambios,
          suspensiones o decisiones de las plataformas de terceros.
        </p>
      </Section>

      <Section title="6. Planes, pagos y cancelación">
        <p className="mt-3 text-muted-foreground-2">
          Algunos planes de LOCA son pagos. Los precios, la modalidad y lo que incluye cada plan se informan al
          momento de la contratación. Los pagos se procesan a través de <strong>Stripe</strong>. Salvo que se
          indique lo contrario, las suscripciones se renuevan automáticamente por el período contratado; podés
          cancelar la renovación desde tu cuenta o escribiéndonos. Los importes ya abonados no son reembolsables,
          salvo que la ley aplicable exija lo contrario.
        </p>
      </Section>

      <Section title="7. Propiedad intelectual">
        <p className="mt-3 text-muted-foreground-2">
          La plataforma LOCA, su software, marca y diseño son propiedad de INFINIDAD S.R.L. Vos conservás los
          derechos sobre tu marca, tus datos y el contenido que apruebes. No podés copiar, revender ni explotar la
          plataforma sin nuestra autorización.
        </p>
      </Section>

      <Section title="8. Disponibilidad y cambios del servicio">
        <p className="mt-3 text-muted-foreground-2">
          Trabajamos para mantener LOCA disponible, pero el servicio se ofrece “tal cual” y puede tener
          interrupciones, mantenimientos o cambios. Podemos modificar, suspender o discontinuar funciones en
          cualquier momento. Avisaremos los cambios relevantes cuando corresponda.
        </p>
      </Section>

      <Section title="9. Limitación de responsabilidad">
        <p className="mt-3 text-muted-foreground-2">
          En la máxima medida permitida por la ley, LOCA no será responsable por daños indirectos, lucro cesante,
          pérdida de datos o perjuicios derivados del uso o la imposibilidad de uso del servicio, del contenido
          generado con IA, ni de decisiones de plataformas de terceros. Nuestra responsabilidad total se limita a
          los importes que hayas abonado a LOCA en los últimos tres (3) meses.
        </p>
      </Section>

      <Section title="10. Indemnidad">
        <p className="mt-3 text-muted-foreground-2">
          Te comprometés a mantener indemne a LOCA frente a reclamos de terceros derivados del contenido que
          publiques, del uso indebido del servicio o del incumplimiento de estos Términos.
        </p>
      </Section>

      <Section title="11. Suspensión y baja">
        <p className="mt-3 text-muted-foreground-2">
          Podés dar de baja tu cuenta cuando quieras. Podemos suspender o cancelar cuentas que incumplan estos
          Términos o que representen un riesgo para el servicio o terceros.
        </p>
      </Section>

      <Section title="12. Privacidad">
        <p className="mt-3 text-muted-foreground-2">
          El tratamiento de tus datos se rige por nuestra{" "}
          <Link href="/legal/privacy" className="font-semibold text-accent hover:underline">
            Política de Privacidad
          </Link>
          , que forma parte de estos Términos.
        </p>
      </Section>

      <Section title="13. Ley aplicable y jurisdicción">
        <p className="mt-3 text-muted-foreground-2">
          Estos Términos se rigen por las leyes de la República Argentina. Ante cualquier controversia, se aplicará
          la jurisdicción de los tribunales ordinarios de la Ciudad Autónoma de Buenos Aires.
        </p>
      </Section>

      <Section title="14. Contacto">
        <p className="mt-3 text-muted-foreground-2">
          Ante cualquier duda sobre estos Términos, escribinos a{" "}
          <a href="mailto:soporte@heyloca.ai" className="font-semibold text-accent hover:underline">
            soporte@heyloca.ai
          </a>
          .
        </p>
      </Section>

      <p className="mt-12 text-sm text-faint">
        <Link href="/" className="hover:underline">
          ← Volver a LOCA
        </Link>
      </p>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <h2 className="mt-10 text-xl font-bold tracking-tight text-foreground">{title}</h2>
      {children}
    </>
  );
}
