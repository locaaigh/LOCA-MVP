// ─────────────────────────────────────────────────────────────
// Ejemplos / placeholders contextuales por industria.
// La idea: que el usuario nunca tenga que pensar desde cero.
// ─────────────────────────────────────────────────────────────

type Bucket = "food" | "ecommerce" | "services" | "default";

function bucketFor(industry: string): Bucket {
  const i = (industry || "").toLowerCase();
  if (i.includes("food") || i.includes("beverage")) return "food";
  if (i.includes("e-commerce") || i.includes("ecommerce") || i.includes("online") || i.includes("retail"))
    return "ecommerce";
  if (
    i.includes("service") ||
    i.includes("consulting") ||
    i.includes("coaching") ||
    i.includes("professional") ||
    i.includes("marketing")
  )
    return "services";
  return "default";
}

const EXAMPLES: Record<string, Record<Bucket, string>> = {
  shortDescription: {
    food: "Café de especialidad en Palermo con pastelería artesanal y opciones para llevar.",
    ecommerce: "Tienda online de decoración hecha a mano, con envíos a todo el país.",
    services: "Estudio de diseño que ayuda a marcas chicas a verse profesionales.",
    default: "En una frase, ¿qué hace tu negocio y para quién?",
  },
  fullDescription: {
    food: "Somos una cafetería de especialidad enfocada en café filtrado, brunch simple y pastelería casera. Buscamos que la gente nos elija para trabajar, encontrarse con amigos o llevarse un buen café al paso.",
    ecommerce:
      "Somos una tienda online que reúne productos hechos a mano por artesanos locales. Cada pieza es única y sustentable. Enviamos a todo el país y armamos regalos especiales.",
    services:
      "Acompañamos a emprendedores y pymes a ordenar su marca y su comunicación. Trabajamos con procesos simples, cercanos y enfocados en resultados concretos.",
    default:
      "Contanos más sobre tu negocio: qué ofrecés, a quién ayudás, tu historia y lo que te hace distinto.",
  },
  competitiveAdvantage: {
    food: "Café de alta calidad, atención cercana y un espacio cálido para trabajar o reunirse.",
    ecommerce: "Productos exclusivos hechos a mano, con historia y materiales sustentables.",
    services: "Atención personalizada, procesos claros y foco en resultados reales.",
    default: "¿Qué hacés mejor que tu competencia? Calidad, precio, atención, exclusividad…",
  },
  productName: {
    food: "Café filtrado",
    ecommerce: "Maceta de cerámica artesanal",
    services: "Asesoría inicial",
    default: "Tu producto o servicio más importante",
  },
  productShort: {
    food: "Café de especialidad preparado con métodos filtrados, ideal para quienes buscan sabor suave y aromático.",
    ecommerce: "Pieza única torneada a mano y esmaltada, perfecta para sumar carácter a cualquier espacio.",
    services: "Sesión de diagnóstico para entender tu situación y recomendar próximos pasos.",
    default: "En una frase, ¿qué es y para qué sirve?",
  },
  productLong: {
    food: "Selección rotativa de granos de origen, preparados en métodos de filtrado para resaltar las notas únicas de cada cosecha. Servido en taza o para llevar.",
    ecommerce:
      "Macetas de cerámica hechas a mano por ceramistas locales. Cada pieza es irrepetible, con esmaltes sin plomo y terminaciones cuidadas.",
    services:
      "Una sesión inicial donde revisamos tu situación actual, identificamos oportunidades y armamos un plan de próximos pasos claro y accionable.",
    default: "Contanos más: características, beneficios, en qué se diferencia.",
  },
  productFeatures: {
    food: "Origen Colombia, notas frutales, molienda a pedido",
    ecommerce: "Hecho a mano, pieza única, materiales sustentables",
    services: "Diagnóstico, plan de acción, seguimiento",
    default: "Características principales separadas por coma",
  },
  businessObjectives: {
    food: "Llenar el local en horarios valle y fidelizar clientes que vuelvan cada semana.",
    ecommerce: "Aumentar las ventas online y el ticket promedio por compra.",
    services: "Conseguir clientes recurrentes y proyectos de mayor valor.",
    default: "¿Qué querés lograr con tu negocio en los próximos meses?",
  },
  marketingObjectives: {
    food: "Crecer la comunidad local y aumentar visitas entre semana.",
    ecommerce: "Construir marca y vender de forma constante todo el año.",
    services: "Generar confianza y posicionarnos como referentes del rubro.",
    default: "¿Qué querés lograr con tu marketing? Más alcance, ventas, confianza…",
  },
  behavior: {
    food: "Activos en Instagram, valoran la estética y las recomendaciones de amigos.",
    ecommerce: "Compran online, se inspiran en Instagram y Pinterest antes de decidir.",
    services: "Investigan antes de contratar, comparan y buscan referencias.",
    default: "¿Cómo se comporta tu cliente? Dónde está, cómo decide, qué valora.",
  },
  painPoint: {
    food: "No encuentran café de calidad cerca",
    ecommerce: "Quieren decorar con piezas con identidad, no de cadenas",
    services: "No saben por dónde empezar y les falta tiempo",
    default: "¿Qué problema le resolvés a tu cliente?",
  },
};

export function getFieldExample(
  fieldName: string,
  industry?: string,
  _subcategory?: string
): string {
  const field = EXAMPLES[fieldName];
  if (!field) return "";
  return field[bucketFor(industry || "")] || field.default;
}
