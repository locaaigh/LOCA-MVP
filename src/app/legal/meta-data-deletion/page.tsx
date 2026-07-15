import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Eliminación de datos — LOCA",
  description:
    "Cómo pedir la eliminación de tus datos de Instagram y Facebook conectados a LOCA.",
};

/**
 * Página pública requerida por Meta ("Data Deletion Instructions URL").
 * Registrar en Meta Console: {dominio}/legal/meta-data-deletion
 */
export default function MetaDataDeletionPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm font-bold uppercase tracking-wider text-loca-600">LOCA</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
        Eliminación de datos de Instagram y Facebook
      </h1>
      <p className="mt-4 text-zinc-600">
        Si conectaste tu cuenta de Instagram o Facebook a LOCA y querés que eliminemos
        los datos asociados, acá te explicamos qué guardamos y cómo pedir el borrado.
      </p>

      <h2 className="mt-10 text-xl font-bold tracking-tight text-zinc-900">
        Qué datos guardamos
      </h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-zinc-600">
        <li>Tokens de acceso a tu cuenta (guardados cifrados), necesarios para publicar en tu nombre.</li>
        <li>Identificadores de tu página de Facebook y tu cuenta de Instagram Business (ID y nombre).</li>
        <li>Métricas de rendimiento de tus publicaciones, si usás esa función.</li>
      </ul>
      <p className="mt-3 text-zinc-600">
        No guardamos tu contraseña de Facebook ni de Instagram, ni tenemos acceso a tus
        mensajes privados.
      </p>

      <h2 className="mt-10 text-xl font-bold tracking-tight text-zinc-900">
        Cómo pedir la eliminación
      </h2>
      <ol className="mt-3 list-decimal space-y-3 pl-5 text-zinc-600">
        <li>
          <strong>Desde LOCA:</strong> entrá a <em>Configuración → Instagram y Facebook</em> y
          tocá <em>Desconectar</em>. Esto borra de inmediato los tokens y los datos de conexión
          de nuestra base de datos.
        </li>
        <li>
          <strong>Desde Facebook:</strong> en{" "}
          <em>Configuración → Apps y sitios web</em>, eliminá LOCA. Recibimos la notificación
          de Meta y revocamos automáticamente los tokens asociados a tu cuenta.
        </li>
        <li>
          <strong>Por email:</strong> escribinos a{" "}
          <a href="mailto:soporte@loca.app" className="font-semibold text-loca-600 hover:underline">
            soporte@loca.app
          </a>{" "}
          desde el email de tu cuenta, con asunto “Eliminación de datos”. Procesamos el pedido
          en un plazo máximo de 30 días y te confirmamos por email.
        </li>
      </ol>

      <h2 className="mt-10 text-xl font-bold tracking-tight text-zinc-900">
        Qué se elimina
      </h2>
      <p className="mt-3 text-zinc-600">
        Se eliminan los tokens de acceso, los identificadores de tus cuentas de Meta y las
        métricas asociadas. Los contenidos que creaste dentro de LOCA (estrategias, calendarios,
        textos e imágenes) no se ven afectados; podés borrarlos vos desde la app o pedirlo en el
        mismo email.
      </p>

      <p className="mt-12 text-sm text-zinc-400">
        <Link href="/" className="hover:underline">← Volver a LOCA</Link>
      </p>
    </main>
  );
}
