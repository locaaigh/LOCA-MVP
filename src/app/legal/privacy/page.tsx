import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidad — LOCA",
  description:
    "Cómo LOCA recolecta, usa y protege tus datos y los de tus cuentas de Instagram, Facebook y LinkedIn.",
};

/**
 * Página pública de Política de Privacidad. Requerida por Meta (Privacy Policy
 * URL) y por LinkedIn/Stripe. Registrar en Meta Console: {dominio}/legal/privacy
 *
 * NOTA LEGAL: borrador operativo. Antes de publicar en producción, que lo revise
 * un asesor legal y completá los datos entre corchetes (razón social, domicilio).
 */
export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm font-bold uppercase tracking-wider text-accent">LOCA</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Política de Privacidad</h1>
      <p className="mt-2 text-sm text-faint">Última actualización: agosto de 2026</p>

      <p className="mt-6 text-muted-foreground-2">
        LOCA es una herramienta de marketing con inteligencia artificial que ayuda a negocios a crear
        estrategia y contenido y, opcionalmente, a publicarlo en sus redes sociales. LOCA es operado por{" "}
        <strong>INFINIDAD S.R.L.</strong> (CUIT 30-71581900-3), con domicilio en{" "}
        <strong>Condarco 3145, Ciudad Autónoma de Buenos Aires, Argentina</strong> (“LOCA”, “nosotros”). Esta
        política explica qué datos recolectamos, cómo los usamos y qué derechos tenés. Al usar LOCA aceptás lo
        aquí descripto.
      </p>

      <Section title="1. Qué datos recolectamos">
        <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground-2">
          <li>
            <strong>Datos de tu cuenta:</strong> email y nombre que usás para registrarte.
          </li>
          <li>
            <strong>Información de tu negocio:</strong> lo que cargás en el onboarding (nombre, industria,
            productos/servicios, audiencia, objetivos, identidad visual, fotos que subís, etc.).
          </li>
          <li>
            <strong>Contenido generado:</strong> estrategias, calendarios, textos e imágenes creados en LOCA.
          </li>
          <li>
            <strong>Datos de tus cuentas de redes (si las conectás):</strong> tokens de acceso (guardados
            <strong> cifrados</strong>), identificadores y nombre de tu Página de Facebook y tu cuenta de
            Instagram Business (y en el futuro LinkedIn), y métricas de rendimiento de tus publicaciones si
            usás esa función. <strong>No</strong> guardamos tus contraseñas ni accedemos a tus mensajes privados.
          </li>
          <li>
            <strong>Datos de uso:</strong> información técnica básica para operar y mejorar el servicio.
          </li>
        </ul>
      </Section>

      <Section title="2. Cómo usamos tus datos">
        <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground-2">
          <li>Generar tu estrategia, calendario, textos e imágenes con IA.</li>
          <li>Publicar contenido en tus redes <strong>solo cuando vos lo aprobás</strong> y con tu autorización.</li>
          <li>Mostrarte métricas de tus publicaciones.</li>
          <li>Operar, mantener y mejorar el servicio, y brindarte soporte.</li>
        </ul>
        <p className="mt-3 text-muted-foreground-2">
          No vendemos tus datos. No los usamos para publicidad de terceros.
        </p>
      </Section>

      <Section title="3. Con quién compartimos datos (encargados de tratamiento)">
        <p className="mt-3 text-muted-foreground-2">
          Compartimos datos únicamente con proveedores que nos permiten prestar el servicio, y solo lo necesario:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground-2">
          <li>
            <strong>Proveedores de IA</strong> (Anthropic, Google Gemini y/u OpenAI): se les envían los datos
            de tu negocio y las instrucciones para generar tu contenido.
          </li>
          <li>
            <strong>Supabase</strong>: base de datos, autenticación y almacenamiento de tus contenidos e imágenes.
          </li>
          <li>
            <strong>Meta (Instagram/Facebook)</strong> y, en el futuro, <strong>LinkedIn</strong>: para publicar
            en tu nombre y traer métricas, con tu conexión y autorización.
          </li>
          <li>
            <strong>Stripe</strong>: procesamiento de pagos (cuando corresponda).
          </li>
          <li>
            <strong>Vercel</strong>: hosting de la aplicación.
          </li>
        </ul>
      </Section>

      <Section title="4. Datos de las plataformas de Meta">
        <p className="mt-3 text-muted-foreground-2">
          El uso de la información obtenida de las APIs de Meta se ajusta a las Políticas de la Plataforma de Meta.
          Usamos los permisos que autorizás únicamente para: mostrar tus Páginas y cuenta de Instagram, publicar
          el contenido que aprobás y leer métricas de tus publicaciones. Guardamos los tokens de acceso cifrados y
          los revocamos cuando desconectás la cuenta o eliminás la app.
        </p>
      </Section>

      <Section title="5. Almacenamiento y seguridad">
        <p className="mt-3 text-muted-foreground-2">
          Los tokens de acceso a tus redes se guardan cifrados. Aplicamos medidas técnicas y organizativas
          razonables para proteger tu información. Ningún sistema es 100% infalible, pero trabajamos para
          minimizar riesgos.
        </p>
      </Section>

      <Section title="6. Transferencias internacionales de datos">
        <p className="mt-3 text-muted-foreground-2">
          Algunos de nuestros proveedores (por ejemplo Anthropic, Google, OpenAI, Supabase, Vercel y Stripe)
          procesan y almacenan datos fuera de Argentina, principalmente en Estados Unidos. Al usar LOCA aceptás
          que tu información pueda ser transferida y tratada en esos países, con proveedores que aplican medidas
          de protección adecuadas. Estas transferencias se realizan conforme a la Ley 25.326 de Protección de los
          Datos Personales de la República Argentina.
        </p>
      </Section>

      <Section title="7. Retención y eliminación de datos">
        <p className="mt-3 text-muted-foreground-2">
          Conservamos tus datos mientras tengas una cuenta activa o mientras sean necesarios para prestarte el
          servicio. Podés desconectar tus redes o pedir la eliminación de tus datos en cualquier momento. Ver{" "}
          <Link href="/legal/meta-data-deletion" className="font-semibold text-accent hover:underline">
            Eliminación de datos
          </Link>
          .
        </p>
      </Section>

      <Section title="8. Tus derechos">
        <p className="mt-3 text-muted-foreground-2">
          Podés acceder, corregir, exportar o eliminar tu información, y retirar tu consentimiento para la
          conexión de tus redes. Escribinos a{" "}
          <a href="mailto:soporte@heyloca.ai" className="font-semibold text-accent hover:underline">
            soporte@heyloca.ai
          </a>
          .
        </p>
      </Section>

      <Section title="9. Menores de edad">
        <p className="mt-3 text-muted-foreground-2">
          LOCA está dirigido a negocios y personas mayores de edad. No recolectamos datos de menores de forma
          intencional.
        </p>
      </Section>

      <Section title="10. Cambios en esta política">
        <p className="mt-3 text-muted-foreground-2">
          Podemos actualizar esta política. Publicaremos la versión vigente en esta página con su fecha de
          actualización.
        </p>
      </Section>

      <Section title="11. Jurisdicción y ley aplicable">
        <p className="mt-3 text-muted-foreground-2">
          Esta política y el uso de LOCA se rigen por las leyes de la República Argentina. Ante cualquier
          controversia, se aplicará la jurisdicción de los tribunales ordinarios de la Ciudad Autónoma de
          Buenos Aires.
        </p>
      </Section>

      <Section title="12. Contacto">
        <p className="mt-3 text-muted-foreground-2">
          Ante cualquier duda sobre privacidad, escribinos a{" "}
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
