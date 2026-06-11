import Link from "next/link";
import { Logo, EvaAvatar } from "@/components/brand";
import {
  Sparkles,
  CalendarDays,
  ImageIcon,
  Megaphone,
  FileText,
  CheckCircle2,
} from "lucide-react";

const FEATURES = [
  { icon: Sparkles, title: "Estrategia", desc: "Posicionamiento, pilares de contenido y tono de voz." },
  { icon: CalendarDays, title: "Calendario", desc: "16 publicaciones al mes, listas y organizadas." },
  { icon: FileText, title: "Contenidos", desc: "Captions, hooks, CTAs y hashtags para cada pieza." },
  { icon: ImageIcon, title: "Imágenes", desc: "Imágenes reales con IA o placeholders de marca." },
  { icon: Megaphone, title: "Ads", desc: "Estrategia de Meta y Google Ads lista para usar." },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo className="text-2xl" />
        <nav className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
            Iniciar sesión
          </Link>
          <Link
            href="/onboarding"
            className="rounded-lg bg-loca-600 px-4 py-2 text-sm font-medium text-white hover:bg-loca-700"
          >
            Empezar
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-12 pt-10 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-loca-50 px-3 py-1 text-sm font-medium text-loca-700">
          <Sparkles className="h-4 w-4" /> Humanless marketing.
        </span>
        <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-extrabold leading-tight tracking-tight text-zinc-900 sm:text-5xl">
          Marketing con IA para negocios{" "}
          <span className="text-loca-600">sin tiempo, sin equipo y sin presupuesto de agencia.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-zinc-600">
          Completá un formulario y <strong>Eva</strong> genera estrategia, calendario, contenidos,
          imágenes y anuncios listos para usar.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/onboarding"
            className="rounded-xl bg-loca-600 px-7 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-loca-700"
          >
            Empezar con un formulario
          </Link>
          <Link
            href="/demo"
            className="rounded-xl border border-zinc-300 bg-white px-7 py-3.5 text-base font-semibold text-zinc-800 hover:bg-zinc-50"
          >
            Probar demo
          </Link>
        </div>
        <p className="mt-4 text-sm text-zinc-400">Un formulario. Eso es todo.</p>
      </section>

      {/* Eva strip */}
      <section className="mx-auto mb-16 max-w-4xl px-6">
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-gradient-to-br from-loca-600 to-loca-800 px-8 py-10 text-center text-white sm:flex-row sm:text-left">
          <EvaAvatar size={64} />
          <div>
            <h2 className="text-xl font-bold">Dejá que Eva arme tu motor de marketing</h2>
            <p className="mt-1 text-loca-100">
              Contenido, estrategia y anuncios sin contratar una agencia. Tu marketing listo en
              minutos.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-zinc-200 bg-white p-5">
              <f.icon className="h-7 w-7 text-loca-600" />
              <h3 className="mt-3 font-semibold text-zinc-900">{f.title}</h3>
              <p className="mt-1 text-sm text-zinc-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-zinc-50 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-zinc-900">Cómo funciona</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              ["1", "Completá tu negocio", "Un formulario simple con lo esencial de tu marca."],
              ["2", "Eva genera todo", "Estrategia, calendario, contenidos e imágenes."],
              ["3", "Revisá y exportá", "Editá, aprobá y publicá manualmente cuando quieras."],
            ].map(([n, t, d]) => (
              <div key={n} className="rounded-2xl bg-white p-6 text-center shadow-soft">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-lima-400 font-bold text-ink">
                  {n}
                </div>
                <h3 className="mt-4 font-semibold">{t}</h3>
                <p className="mt-1 text-sm text-zinc-500">{d}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <Link
              href="/onboarding"
              className="rounded-xl bg-loca-600 px-7 py-3.5 text-base font-semibold text-white hover:bg-loca-700"
            >
              Empezar ahora
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-200 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-sm text-zinc-400 sm:flex-row">
          <Logo />
          <p>Humanless marketing. © {new Date().getFullYear()} LOCA.</p>
        </div>
      </footer>
    </main>
  );
}
