/**
 * Landings de conversión por tipo de negocio (heyloca.ai/para/[slug]).
 * Misma plantilla, copy a medida por rubro. Agregar rubros = sumar acá.
 */
import { Briefcase, Rocket, Store, type LucideIcon } from "lucide-react";

export type Industry = {
  slug: string;
  icon: LucideIcon;
  segment: string; // chip del hero
  audience: string; // "para quién" (aparece en subtítulos y SEO)
  h1: string;
  sub: string;
  pains: string[];
  // Qué postearía Eva para este rubro (ejemplos concretos)
  contentExamples: { title: string; desc: string }[];
  outcomes: string[];
  testimonial: { quote: string; name: string; role: string }; // placeholder inventado
  metaTitle: string;
  metaDescription: string;
};

export const INDUSTRIES: Industry[] = [
  {
    slug: "profesionales",
    icon: Briefcase,
    segment: "Profesionales independientes",
    audience: "odontólogos, psicólogos, coaches, abogados, contadores y más",
    h1: "Más clientes, sin robarle horas a tu profesión.",
    sub: "Eva construye tu marca personal y publica por vos, para que ganes confianza y agenda mientras atendés lo que sabés hacer.",
    pains: [
      "Entre turnos y clientes no te queda tiempo para redes.",
      "No sabés qué postear para generar confianza sin parecer un vendedor.",
      "Contratar marketing es carísimo para un profesional que trabaja solo.",
    ],
    contentExamples: [
      { title: "Tips de tu especialidad", desc: "Contenido educativo que te posiciona como referente y genera confianza." },
      { title: "Preguntas frecuentes", desc: "Respondés las dudas típicas de tus clientes y bajás la barrera para contratarte." },
      { title: "Casos y resultados", desc: "Mostrás tu trabajo (con el cuidado que tu profesión requiere) para dar prueba social." },
      { title: "Recordatorios y servicios", desc: "Turnos disponibles, nuevos servicios y promos puntuales, listos para publicar." },
    ],
    outcomes: [
      "Una marca personal sólida que trabaja por vos las 24 horas.",
      "Agenda más llena sin sumar horas de trabajo.",
      "Presencia constante aunque tengas la semana a full.",
    ],
    testimonial: {
      quote: "Ahora tengo presencia constante y me llegan consultas por Instagram sin mover un dedo.",
      name: "Dra. Ana P.",
      role: "Odontóloga",
    },
    metaTitle: "Marketing con IA para profesionales independientes | LOCA",
    metaDescription:
      "LOCA crea y publica el contenido de tu marca personal. Para odontólogos, psicólogos, coaches, abogados y contadores. Más clientes, sin robarle horas a tu profesión.",
  },
  {
    slug: "startups",
    icon: Rocket,
    segment: "Startups",
    audience: "startups tech, B2B, B2C y SaaS",
    h1: "Marketing consistente mientras construís el producto.",
    sub: "Eva te da presencia y autoridad sin sumar headcount: estrategia, contenido y publicación en piloto automático para tu startup.",
    pains: [
      "El equipo es chico y el marketing siempre queda para último.",
      "Necesitás presencia y autoridad, pero nadie tiene tiempo de postear.",
      "Una agencia no entra en el budget de una startup en etapa temprana.",
    ],
    contentExamples: [
      { title: "Lanzamientos y features", desc: "Cada novedad del producto convertida en contenido claro y atractivo." },
      { title: "Contenido de autoridad", desc: "Thought leadership y educación de mercado para posicionar tu marca." },
      { title: "Casos de uso", desc: "Cómo resuelve tu producto problemas reales, contado para tu audiencia ideal." },
      { title: "Cultura y hiring", desc: "Detrás de escena y búsquedas abiertas para atraer talento y comunidad." },
    ],
    outcomes: [
      "Pipeline y comunidad sin sumar una persona al equipo.",
      "Presencia profesional desde el día uno.",
      "Foco del equipo en el producto, no en pensar qué postear.",
    ],
    testimonial: {
      quote: "Pasamos de postear cuando nos acordábamos a tener un calendario fijo y consistente.",
      name: "Sofía D.",
      role: "Co-founder, SaaS B2B",
    },
    metaTitle: "Marketing con IA para startups | LOCA",
    metaDescription:
      "LOCA le da a tu startup presencia y autoridad sin sumar headcount. Estrategia, contenido y publicación automática para tech, B2B, B2C y SaaS.",
  },
  {
    slug: "comercios",
    icon: Store,
    segment: "Pequeños comercios",
    audience: "locales, gastronomía, cervecerías y cafeterías",
    h1: "Llená tu local sin vivir pegado al celular.",
    sub: "Eva arma los posts de tus productos, promos y novedades, y los publica por vos. Vos atendé tu negocio; del marketing se encarga ella.",
    pains: [
      "Atendés el local todo el día y no te queda energía para redes.",
      "Postear todos los días de forma consistente es imposible.",
      "Los números de una agencia no cierran para un comercio chico.",
    ],
    contentExamples: [
      { title: "Promos y novedades", desc: "Ofertas del día, combos y lanzamientos listos para publicar en el momento justo." },
      { title: "Productos y menú", desc: "Tus productos estrella y el menú del día presentados para que den ganas de venir." },
      { title: "Fechas especiales", desc: "Día del amigo, feriados y fechas de tu rubro con contenido pensado para cada una." },
      { title: "Reseñas de clientes", desc: "Prueba social que convierte a quien todavía no te conoce." },
    ],
    outcomes: [
      "Más gente entrando por la puerta.",
      "Clientes que vuelven porque te tienen presente.",
      "Redes activas todos los días sin que te robe tiempo.",
    ],
    testimonial: {
      quote: "Publico todos los días sin tocar nada. Antes no llegaba nunca y se notaba.",
      name: "Martina G.",
      role: "Dueña de cafetería",
    },
    metaTitle: "Marketing con IA para comercios y gastronomía | LOCA",
    metaDescription:
      "LOCA crea y publica el contenido de tu local: promos, productos y novedades. Para comercios, gastronomía, cervecerías y cafeterías. Llená tu local sin vivir pegado al celular.",
  },
];

export function getIndustry(slug: string): Industry | undefined {
  return INDUSTRIES.find((i) => i.slug === slug);
}
