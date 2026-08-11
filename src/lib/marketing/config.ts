/**
 * Configuración y contenido de la web de marketing (heyloca.ai).
 *
 * Arquitectura de dominios (opción A — un solo codebase, ruteo por host):
 *   - heyloca.ai        → web de marketing (estas páginas)
 *   - app.heyloca.ai    → plataforma (grupo (app), onboarding, login, etc.)
 * El split lo activa el middleware SOLO cuando NEXT_PUBLIC_APP_ORIGIN está
 * seteado. Sin esa env todo convive en un mismo dominio (dev y deploy inicial).
 */
import {
  Sparkles,
  FileText,
  CalendarDays,
  Send,
  Palette,
  MessageCircle,
  BarChart3,
  CalendarClock,
  Globe,
  Wand2,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";

export const SUPPORT_EMAIL = "soporte@heyloca.ai";
export const MARKETING_DOMAIN = "heyloca.ai";

/**
 * Devuelve la URL de la plataforma para un path dado.
 * - En producción con dominios separados: seteá NEXT_PUBLIC_APP_ORIGIN
 *   (ej. "https://app.heyloca.ai") y los CTAs apuntan al subdominio.
 * - Sin esa env (dev / un solo dominio): devuelve un path relativo.
 */
export function appHref(path: string): string {
  const origin = process.env.NEXT_PUBLIC_APP_ORIGIN?.replace(/\/$/, "");
  const clean = path.startsWith("/") ? path : `/${path}`;
  return origin ? `${origin}${clean}` : clean;
}

// ── Navegación de la web ──────────────────────────────────────
export const NAV_LINKS = [
  { href: "/funcionalidades", label: "Funcionalidades" },
  { href: "/como-funciona", label: "Cómo funciona" },
  { href: "/precios", label: "Precios" },
] as const;

// ── Beneficios "sin…" (hero secundario) ───────────────────────
export const BENEFITS = [
  { title: "Sin agencia", desc: "No contratás a nadie ni esperás semanas." },
  { title: "Sin saber de marketing", desc: "Eva te guía paso a paso, en lenguaje simple." },
  { title: "Sin empezar de cero", desc: "Contás tu negocio y ya tenés todo armado." },
] as const;

// ── Dolores (sección problema de la home) ─────────────────────
export const PAINS = [
  "Publicar todos los días te come horas que no tenés.",
  "No sabés qué postear, ni cuándo, ni por qué.",
  "Una agencia cuesta lo que no querés pagar todos los meses.",
  "Las herramientas sueltas (diseño, IA, planificación) no hablan entre sí.",
] as const;

// ── Cómo funciona (3 pasos) ───────────────────────────────────
export const STEPS: { icon: LucideIcon; n: string; title: string; desc: string }[] = [
  {
    icon: Globe,
    n: "1",
    title: "Contale de tu negocio",
    desc: "Pegá tu web, subí un resumen o completá 5 minutos. Eva entiende quién sos, qué vendés y a quién.",
  },
  {
    icon: Wand2,
    n: "2",
    title: "Eva arma todo",
    desc: "Estrategia, textos, ideas y calendario listos para revisar — con las fechas especiales de tu rubro.",
  },
  {
    icon: CheckCircle2,
    n: "3",
    title: "Aprobás y publica",
    desc: "Conectás Instagram y Facebook y se publica solo, en el mejor momento. Vos siempre tenés la última palabra.",
  },
];

// ── Funcionalidades ───────────────────────────────────────────
export const FEATURES: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Sparkles, title: "Estrategia a medida", desc: "Posicionamiento, pilares de contenido y tono de voz pensados para tu negocio." },
  { icon: FileText, title: "Contenidos listos", desc: "Copies, hooks, ideas y CTAs listos para publicar. Editás lo que quieras." },
  { icon: CalendarDays, title: "Calendario inteligente", desc: "El mes entero organizado, con las mejores fechas y horarios para publicar." },
  { icon: Send, title: "Publicación automática", desc: "Conectás Instagram y Facebook y Eva publica por vos, cuando lo aprobás." },
  { icon: Palette, title: "Brand kit", desc: "Tus colores, tu logo y tu tono aplicados a todo lo que Eva crea." },
  { icon: MessageCircle, title: "Chat con Eva", desc: "Pedile cambios en lenguaje natural: “hacelo más corto”, “sumá una promo”." },
  { icon: CalendarClock, title: "Fechas especiales de tu rubro", desc: "Eva conoce las fechas clave de tu industria y arma contenido para cada una." },
  { icon: BarChart3, title: "Métricas y resultados", desc: "Mirá cómo rinden tus publicaciones sin saltar entre apps." },
];

// ── Comparativa (vs agencia / freelancers / hacerlo solo) ─────
export const COMPARISON = {
  cols: ["", "Agencia", "Freelancers", "Hacerlo solo", "LOCA"],
  rows: [
    ["Costo por mes", "$$$$", "Variable", "Tu tiempo", "USD 89"],
    ["Puesta en marcha", "Semanas", "Días", "—", "Minutos"],
    ["Horas tuyas por semana", "Reuniones", "Coordinación", "8–10 hs", "Casi 0"],
    ["Consistencia", "Alta (cara)", "Depende", "Baja", "Siempre"],
    ["Estrategia incluida", "Sí", "A veces", "No", "Sí"],
  ],
} as const;

// ── Planes ────────────────────────────────────────────────────
export type Plan = {
  id: string;
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: string[];
  cta: { label: string; href: string; external?: boolean };
  highlight: boolean;
};

export const PLANS: Plan[] = [
  {
    id: "contenidos",
    name: "Contenidos",
    price: "USD 89",
    period: "/mes",
    tagline: "Para empezar a publicar en serio, sin agencia.",
    features: [
      "12 contenidos por mes",
      "Elegís en qué redes se publican (según las que conectes)",
      "Estrategia de marketing a medida",
      "Calendario con las fechas especiales de tu rubro",
      "Publicación automática en Instagram y Facebook",
      "Chat con Eva para pedir cambios",
    ],
    cta: { label: "Empezar", href: appHref("/onboarding"), external: true },
    highlight: true,
  },
  {
    id: "enterprise",
    name: "Enterprise / Agencias",
    price: "A cotizar",
    period: "",
    tagline: "Para mayor volumen, multi-marca y agencias.",
    features: [
      "Más contenidos por mes",
      "Varios negocios o marcas en una cuenta",
      "Pensado para agencias y equipos",
      "Onboarding y soporte dedicado",
    ],
    cta: { label: "Hablemos", href: "/contacto" },
    highlight: false,
  },
];

// ── FAQ ───────────────────────────────────────────────────────
export const FAQ = [
  {
    q: "¿Necesito saber de marketing?",
    a: "No. Eva te guía en lenguaje simple y arma la estrategia por vos. Vos solo revisás y aprobás.",
  },
  {
    q: "¿Puedo editar lo que crea Eva?",
    a: "Sí, todo. Podés cambiar textos, pedirle ajustes por chat y aprobar cada contenido antes de que se publique.",
  },
  {
    q: "¿En qué redes publica?",
    a: "Hoy en Instagram y Facebook, y sumamos más próximamente. Elegís en cuáles se publica según las cuentas que conectes.",
  },
  {
    q: "¿Necesito tarjeta para probar?",
    a: "Podés crear tu cuenta, cargar tu negocio y ver tu estrategia. Para activar tu plan y que Eva publique por vos sí necesitás un método de pago.",
  },
  {
    q: "¿Puedo cancelar cuando quiera?",
    a: "Sí, sin contratos ni permanencia. Cancelás desde tu cuenta cuando quieras.",
  },
  {
    q: "¿Mis datos están seguros?",
    a: "Sí. No vendemos tus datos y los tokens de tus redes se guardan cifrados. Podés ver el detalle en nuestra Política de Privacidad.",
  },
] as const;

// ── Testimonios ───────────────────────────────────────────────
// NOTA: placeholders inventados. Reemplazar por testimonios reales
// (se consiguen el próximo mes).
export const TESTIMONIALS = [
  { quote: "Publico todos los días sin tocar nada. Antes no llegaba nunca.", name: "Martina G.", role: "Cafetería de barrio" },
  { quote: "Eva me armó la estrategia que venía posponiendo hace meses.", name: "Lucas R.", role: "Estudio contable" },
  { quote: "Pasamos de postear cuando nos acordábamos a tener un calendario fijo.", name: "Sofía D.", role: "Startup SaaS" },
] as const;
