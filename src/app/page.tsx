import Link from "next/link";
import { Logo, EvaAvatar } from "@/components/brand";
import {
  Sparkles,
  CalendarDays,
  ImageIcon,
  Megaphone,
  FileText,
  ArrowRight,
  Store,
  Lightbulb,
  Wand2,
} from "lucide-react";

const BENEFITS = [
  { icon: Store, title: "Sin agencia", desc: "No necesitás contratar a nadie ni esperar semanas." },
  { icon: Lightbulb, title: "Sin saber marketing", desc: "Eva te guía paso a paso, en lenguaje simple." },
  { icon: Wand2, title: "Sin empezar desde cero", desc: "Completás un formulario y ya tenés todo armado." },
];

const FEATURES = [
  { icon: Sparkles, title: "Estrategia", desc: "Posicionamiento, pilares y tono de voz." },
  { icon: CalendarDays, title: "Calendario", desc: "Las publicaciones del mes, organizadas." },
  { icon: FileText, title: "Contenidos", desc: "Captions, hooks, CTAs y hashtags." },
  { icon: ImageIcon, title: "Imágenes", desc: "Imágenes con IA o placeholders de marca." },
  { icon: Megaphone, title: "Ads", desc: "Estrategia de Meta y Google lista." },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-white/40 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-6">
          <Logo className="text-2xl" />
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="rounded-xl px-3.5 py-2 text-sm font-medium text-zinc-600 transition hover:text-zinc-900">
              Iniciar sesión
            </Link>
            <Link
              href="/onboarding"
              className="rounded-2xl bg-loca-600 px-4 py-2 text-sm font-semibold text-white shadow-lift transition hover:bg-loca-700"
            >
              Empezar
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="loca-hero-bg relative overflow-hidden">
        <div className="mx-auto max-w-3xl px-5 pb-20 pt-16 text-center sm:px-6 sm:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-loca-100 bg-white/70 px-3.5 py-1.5 text-sm font-medium text-loca-700 shadow-sm backdrop-blur">
            <Sparkles className="h-4 w-4" /> Humanless marketing
          </span>
          <h1 className="mx-auto mt-7 text-balance text-5xl font-extrabold leading-[1.05] tracking-tight text-zinc-900 sm:text-7xl">
            Tu marketing listo en minutos.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-balance text-lg text-zinc-600 sm:text-xl">
            Completá un formulario y <strong className="font-semibold text-loca-700">Eva</strong> genera estrategia,
            calendario, contenidos, imágenes y anuncios para tu negocio.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/onboarding"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-loca-600 px-8 py-4 text-base font-semibold text-white shadow-lift transition-all duration-150 hover:bg-loca-700 hover:shadow-glow active:scale-[0.98] sm:w-auto"
            >
              Crear mi marketing <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/demo"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-zinc-200 bg-white/80 px-8 py-4 text-base font-semibold text-zinc-800 backdrop-blur transition hover:border-zinc-300 hover:bg-white sm:w-auto"
            >
              Probar demo
            </Link>
          </div>
          <p className="mt-5 text-sm text-zinc-400">Un formulario. Eso es todo.</p>
        </div>
      </section>

      {/* Beneficios */}
      <section className="mx-auto max-w-5xl px-5 py-16 sm:px-6">
        <div className="grid gap-5 sm:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.title} className="loca-card p-6 transition hover:shadow-lift">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-loca-50 text-loca-600">
                <b.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-zinc-900">{b.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Eva strip */}
      <section className="mx-auto mb-16 max-w-4xl px-5 sm:px-6">
        <div className="relative flex flex-col items-center gap-5 overflow-hidden rounded-3xl bg-gradient-to-br from-loca-600 to-loca-800 px-8 py-12 text-center text-white shadow-pop sm:flex-row sm:text-left">
          <span className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
          <EvaAvatar size={64} />
          <div className="relative">
            <h2 className="text-2xl font-bold tracking-tight">Eva arma tu marketing por vos</h2>
            <p className="mt-1.5 text-loca-100">
              Vos revisás y aprobás. Ella se encarga del resto, en minutos.
            </p>
          </div>
        </div>
      </section>

      {/* Qué genera */}
      <section className="mx-auto max-w-5xl px-5 pb-20 sm:px-6">
        <div className="mb-8 text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-zinc-900">Todo lo que Eva genera</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-3xl border border-zinc-200/60 bg-white p-5 shadow-card transition hover:shadow-lift">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-loca-50 text-loca-600">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-zinc-900">{f.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="border-y border-zinc-200/60 bg-zinc-50/60 py-20">
        <div className="mx-auto max-w-4xl px-5 sm:px-6">
          <h2 className="text-balance text-center text-3xl font-bold tracking-tight text-zinc-900">Cómo funciona</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {[
              ["1", "Completá tu negocio", "Un formulario simple con lo esencial."],
              ["2", "Eva genera todo", "Estrategia, calendario, contenidos e imágenes."],
              ["3", "Revisá y exportá", "Aprobá y publicá manualmente cuando quieras."],
            ].map(([n, t, d]) => (
              <div key={n} className="rounded-3xl bg-white p-7 text-center shadow-card">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-lima-400 text-lg font-bold text-ink shadow-glow-lima">
                  {n}
                </div>
                <h3 className="mt-5 font-semibold text-zinc-900">{t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{d}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 rounded-2xl bg-loca-600 px-8 py-4 text-base font-semibold text-white shadow-lift transition-all duration-150 hover:bg-loca-700 hover:shadow-glow active:scale-[0.98]"
            >
              Crear mi marketing <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-sm text-zinc-400 sm:flex-row sm:px-6">
          <Logo />
          <p>Humanless marketing. © {new Date().getFullYear()} LOCA.</p>
        </div>
      </footer>
    </main>
  );
}
