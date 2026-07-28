import type { Channel, ContentFormat } from "./types";

// ── Industrias ───────────────────────────────────────────────
export const INDUSTRIES: string[] = [
  "Retail & Local Stores",
  "Food & Beverage",
  "Health & Wellness",
  "Beauty & Personal Care",
  "Education & Training",
  "Professional Services",
  "Marketing & Advertising Services",
  "Construction & Home Renovation",
  "Tech & Software Startups",
  "Creative Services",
  "Fashion & Accessories",
  "Travel, Tourism & Hospitality",
  "Events & Entertainment",
  "Automotive Services",
  "Real Estate",
  "Financial Services",
  "Home Services",
  "Manufacturing & Artisanal Production",
  "Sports & Fitness",
  "Nonprofits & Social Causes",
  "Pet Services & Products",
  "Arts & Crafts",
  "E-commerce / Online Stores",
  "Business Consulting & Coaching",
  "Agriculture & Natural Products",
];

// Subcategorías dependientes (cuando hay datos; el resto cae a libre)
export const SUBCATEGORIES: Record<string, string[]> = {
  "Food & Beverage": [
    "Café",
    "Restaurante",
    "Bar",
    "Panadería",
    "Pastelería",
    "Food truck",
    "Catering",
    "Heladería",
    "Vinería",
  ],
  "E-commerce / Online Stores": [
    "Handmade goods store",
    "Moda y accesorios",
    "Decoración y hogar",
    "Tecnología",
    "Belleza y cosmética",
    "Alimentos y bebidas",
    "Productos para mascotas",
  ],
  "Beauty & Personal Care": [
    "Peluquería",
    "Barbería",
    "Salón de uñas",
    "Spa",
    "Estética",
    "Maquillaje",
    "Cosmética natural",
  ],
  "Health & Wellness": [
    "Gimnasio",
    "Estudio de yoga",
    "Nutrición",
    "Pilates",
    "Centro de bienestar",
    "Fisioterapia",
    "Salud mental",
  ],
  "Retail & Local Stores": [
    "Tienda de ropa",
    "Librería",
    "Ferretería",
    "Juguetería",
    "Almacén / mercado",
    "Tienda de regalos",
  ],
  "Professional Services": [
    "Estudio jurídico",
    "Contabilidad",
    "Arquitectura",
    "Diseño",
    "Consultoría",
    "Agencia inmobiliaria",
  ],
  "Real Estate": [
    "Inmobiliaria",
    "Desarrollos",
    "Alquileres temporarios",
    "Asesor independiente",
  ],
  "Fashion & Accessories": [
    "Indumentaria",
    "Calzado",
    "Joyería",
    "Accesorios",
    "Marca de autor",
  ],
  "Sports & Fitness": [
    "Gimnasio",
    "Estudio funcional",
    "Crossfit",
    "Tienda deportiva",
    "Entrenador personal",
  ],
  "Education & Training": [
    "Academia",
    "Cursos online",
    "Idiomas",
    "Clases particulares",
    "Coaching educativo",
  ],
};

export const BUSINESS_TYPES: string[] = [
  "Local físico",
  "Online",
  "Híbrido (físico + online)",
  "Servicios a domicilio",
  "Marca personal",
];

export const VALUE_SUGGESTIONS: string[] = [
  "Precio accesible",
  "Calidad",
  "Atención al cliente",
  "Comunidad",
  "Sustentabilidad",
  "Autenticidad",
  "Creatividad",
  "Innovación",
  "Conveniencia",
  "Inclusividad",
  "Confiabilidad",
  "Apoyo local",
  "Hecho a mano / artesanal",
  "Rapidez / eficiencia",
  "Personalización",
  "Empresa familiar",
  "Tendencia / moda",
  "Tradición / herencia",
  "Transparencia",
  "Eco-friendly",
];

export const ADVANTAGE_SUGGESTIONS: string[] = [
  "Mayor calidad",
  "Productos exclusivos",
  "Mejor precio",
  "Personalización / hecho a medida",
  "Materiales sustentables",
  "Entrega rápida",
  "Mayor variedad",
  "Atención personalizada",
  "Mejor soporte",
  "Programa de fidelización",
  "Política flexible de cambios",
  "Servicio postventa",
  "Mejor ubicación",
  "Expertise de nicho",
  "Producción local",
  "Relevancia cultural",
  "Servicio multilingüe",
  "Marca innovadora",
  "Reputación establecida",
  "Participación en comunidad",
  "Diferenciación estética/visual",
];

export const CHANNELS: Channel[] = ["Instagram", "Facebook", "TikTok", "LinkedIn"];

// Canales en los que un negocio puede estar presente hoy (lista ampliada).
// El campo `id` se usa para mapear el ícono en el ChannelSelector.
export const MARKETING_CHANNELS: { id: string; label: string }[] = [
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "tiktok", label: "TikTok" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "x", label: "X" },
  { id: "pinterest", label: "Pinterest" },
  { id: "youtube", label: "YouTube" },
  { id: "google", label: "Google Business Profile" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "email", label: "Email" },
  { id: "blog", label: "Blog" },
  { id: "none", label: "Ninguno" },
];

// ¿Qué venís haciendo de marketing? (multi-select)
export const MARKETING_ACTIVITIES: string[] = [
  "Nada todavía",
  "Redes orgánicas",
  "Publicidad paga / Ads",
  "Influencer marketing",
  "Email marketing",
  "Blog / SEO",
  "WhatsApp",
  "Eventos / activaciones",
  "Recomendaciones boca a boca",
  "Google Business Profile",
  "Otro",
];

// Temporadas fuertes (si el negocio tiene estacionalidad)
export const SEASONALITY_OPTIONS_DEFAULT: string[] = [
  "☀️ Verano",
  "❄️ Invierno",
  "🌸 Primavera",
  "🍂 Otoño",
  "🎒 Vuelta a clases",
  "👩 Día de la Madre",
  "👨 Día del Padre",
  "🎄 Navidad",
  "🎆 Año Nuevo",
  "🛍️ Hot Sale / Cyber Monday",
  "🏖️ Vacaciones",
  "✈️ Fechas turísticas",
  "Otra",
];

// Fechas especiales importantes
export const SPECIAL_DATES_OPTIONS_DEFAULT: string[] = [
  "🎂 Aniversario de la marca",
  "🚀 Lanzamientos",
  "🏷️ Fechas comerciales",
  "🎪 Eventos propios",
  "💸 Temporadas de descuentos",
  "🏢 Ferias / exposiciones",
  "🇦🇷 Fechas patrias",
  "Otra",
];

// Temporadas fuertes curadas por industria (se anteponen a las genéricas)
export const INDUSTRY_SEASONALITY: Record<string, string[]> = {
  "Food & Beverage": ["☀️ Verano", "❄️ Invierno", "🎄 Navidad y Fin de Año", "🎒 Vuelta a clases"],
  "Beauty & Personal Care": ["👩 Día de la Madre", "🎄 Navidad y Fin de Año", "💒 Temporada de casamientos"],
  "Health & Wellness": ["🎯 Enero (propósitos de año nuevo)", "☀️ Verano", "❄️ Invierno"],
  "Sports & Fitness": ["🎯 Enero (propósitos de año nuevo)", "☀️ Operación verano", "❄️ Invierno"],
  "Retail & Local Stores": ["🎄 Navidad y Fin de Año", "🎒 Vuelta a clases", "🛍️ Hot Sale / Cyber Monday"],
  "E-commerce / Online Stores": ["🛍️ Hot Sale / Cyber Monday", "🎄 Navidad y Fin de Año", "🎒 Vuelta a clases"],
  "Fashion & Accessories": ["🌸 Primavera / Verano", "❄️ Otoño / Invierno", "🎄 Navidad y Fin de Año"],
  "Education & Training": ["🎒 Vuelta a clases", "🎓 Fin de cursada", "🏖️ Vacaciones de verano"],
  "Real Estate": ["🎒 Vuelta a clases (mudanzas)", "☀️ Verano", "🎄 Fin de año"],
  "Professional Services": ["🎯 Enero (planificación anual)", "🎄 Cierre de año fiscal"],
  "Marketing & Advertising Services": ["🎯 Enero (planificación anual)", "🎄 Cierre de año fiscal"],
  "Construction & Home Renovation": ["☀️ Verano (obras)", "🎒 Antes de vuelta a clases (remodelaciones)"],
  "Tech & Software Startups": ["🎯 Enero (planificación anual)", "🎄 Cierre de año fiscal"],
  "Creative Services": ["🎨 Verano (campañas)", "🎄 Cierre de año fiscal"],
  "Travel, Tourism & Hospitality": ["☀️ Verano", "🏖️ Vacaciones de invierno", "✈️ Fechas turísticas"],
  "Events & Entertainment": ["🎉 Fiestas de fin de año", "💍 Temporada de casamientos", "🎓 Egresados"],
  "Automotive Services": ["☀️ Verano (viajes)", "❄️ Invierno (mantenimiento)"],
  "Financial Services": ["🎯 Enero (planificación financiera)", "📊 Cierre de ejercicio fiscal"],
  "Home Services": ["🎒 Vuelta a clases (mudanzas)", "☀️ Verano", "🎄 Fin de año (limpieza)"],
  "Manufacturing & Artisanal Production": ["🎄 Navidad y Fin de Año", "🎒 Vuelta a clases"],
  "Nonprofits & Social Causes": ["🎗️ Fin de año (campañas de donación)", "🎄 Navidad solidaria"],
  "Pet Services & Products": ["☀️ Verano", "🎄 Navidad y Fin de Año"],
  "Arts & Crafts": ["🎄 Navidad y Fin de Año", "🎒 Vuelta a clases"],
  "Business Consulting & Coaching": ["🎯 Enero (planificación anual)", "🎄 Cierre de año fiscal"],
  "Agriculture & Natural Products": ["🌾 Cosecha", "☀️ Verano"],
};

// Fechas especiales curadas por industria (se anteponen a las genéricas)
export const INDUSTRY_SPECIAL_DATES: Record<string, string[]> = {
  "Food & Beverage": ["☕ Día del Café", "🍕 Día de la Pizza", "🍞 Día del Panadero"],
  "Beauty & Personal Care": ["💅 Día de la Mujer", "💇 Día del Peluquero/a"],
  "Health & Wellness": ["🥗 Día Mundial de la Nutrición", "🏃 Día Mundial de la Actividad Física"],
  "Sports & Fitness": ["🏃 Día Mundial de la Actividad Física", "⚽ Día del Deporte"],
  "Retail & Local Stores": ["🛍️ Black Friday", "💻 Cyber Monday"],
  "E-commerce / Online Stores": ["🛍️ Black Friday", "💻 Cyber Monday"],
  "Fashion & Accessories": ["👗 Semana de la Moda", "🛍️ Black Friday"],
  "Education & Training": ["📚 Día del Estudiante", "🍎 Día del Maestro"],
  "Real Estate": ["🏠 Día del Arquitecto", "🔑 Día de la Vivienda"],
  "Professional Services": ["💼 Día del Emprendedor", "🤝 Día de la Pyme"],
  "Marketing & Advertising Services": ["📱 Día del Community Manager", "💡 Día de la Publicidad"],
  "Construction & Home Renovation": ["🏗️ Día del Arquitecto", "🔨 Día de la Construcción"],
  "Tech & Software Startups": ["💻 Día del Programador", "🚀 Día del Emprendedor"],
  "Creative Services": ["🎨 Día del Diseñador Gráfico", "📷 Día de la Fotografía"],
  "Travel, Tourism & Hospitality": ["🌍 Día Mundial del Turismo", "✈️ Día del Turista"],
  "Events & Entertainment": ["🎭 Día del Actor", "🎶 Día de la Música"],
  "Automotive Services": ["🚗 Día del Automovilista", "🔧 Día del Mecánico"],
  "Financial Services": ["💰 Día del Contador", "📈 Día del Inversor"],
  "Home Services": ["🧹 Día del Trabajador de la Limpieza", "🔧 Día del Plomero"],
  "Manufacturing & Artisanal Production": ["🛠️ Día del Trabajador Industrial", "✋ Día del Artesano"],
  "Nonprofits & Social Causes": ["🤲 Día de la Solidaridad", "🌍 Día del Voluntariado"],
  "Pet Services & Products": ["🐾 Día del Animal", "🐶 Día del Veterinario"],
  "Arts & Crafts": ["✋ Día del Artesano", "🎨 Día del Arte"],
  "Business Consulting & Coaching": ["💼 Día del Emprendedor", "🤝 Día de la Pyme"],
  "Agriculture & Natural Products": ["🌾 Día del Productor Agropecuario", "🌱 Día de la Tierra"],
};

export function seasonalityOptionsFor(industry: string): string[] {
  return [...(INDUSTRY_SEASONALITY[industry] || []), ...SEASONALITY_OPTIONS_DEFAULT];
}

export function specialDatesOptionsFor(industry: string): string[] {
  return [...(INDUSTRY_SPECIAL_DATES[industry] || []), ...SPECIAL_DATES_OPTIONS_DEFAULT];
}

export const GENDER_OPTIONS: { value: string; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "masculino", label: "Masculino" },
  { value: "femenino", label: "Femenino" },
  { value: "otro", label: "Otro / personalizado" },
];

// Años de fundación: "Todavía no lancé" + año actual hacia 1900.
export function foundingYearOptions(currentYear: number): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [
    { value: "no_lanzado", label: "Todavía no lancé" },
  ];
  for (let y = currentYear; y >= 1900; y--) {
    opts.push({ value: String(y), label: String(y) });
  }
  return opts;
}

export const AGE_RANGES: string[] = [
  "13-17",
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55-64",
  "65+",
];

export const CONTENT_FORMATS: { value: ContentFormat; label: string }[] = [
  { value: "post_estatico", label: "Post estático" },
  { value: "carrusel", label: "Carrusel" },
  { value: "reel", label: "Reel / Video" },
  { value: "story", label: "Story" },
  { value: "ad", label: "Anuncio (Ad)" },
  { value: "email", label: "Idea de email" },
];

export const FEEDBACK_OPTIONS: { value: string; label: string }[] = [
  { value: "mas_corto", label: "Hacerlo más corto" },
  { value: "mas_vendedor", label: "Hacerlo más vendedor" },
  { value: "mas_emocional", label: "Hacerlo más emocional" },
  { value: "mas_premium", label: "Hacerlo más premium" },
  { value: "mas_local", label: "Hacerlo más local" },
  { value: "mas_divertido", label: "Hacerlo más divertido" },
  { value: "mas_profesional", label: "Hacerlo más profesional" },
  { value: "agregar_urgencia", label: "Agregar urgencia" },
  { value: "cambiar_cta", label: "Cambiar el CTA" },
];

export const CONTENT_STATUS_LABELS: Record<string, string> = {
  borrador: "Borrador",
  generado: "Generado",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  publicado_manualmente: "Publicado manualmente",
  pending_review: "Pendiente de revisión",
  needs_changes: "Necesita cambios",
  scheduled: "Programado",
  published: "Publicado",
  archived: "Archivado",
};

export const PUBLISH_STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  listo_para_publicar: "Listo para publicar",
  publicado_manualmente: "Publicado manualmente",
};

export const FORMAT_LABELS: Record<string, string> = {
  post_estatico: "Post estático",
  carrusel: "Carrusel",
  reel: "Reel / Video",
  story: "Story",
  ad: "Anuncio",
  email: "Email",
};

export const IMAGE_FORMAT_LABELS: Record<string, string> = {
  "1:1": "1:1 — Post",
  "4:5": "4:5 — Feed",
  "9:16": "9:16 — Story / Reel",
};

export const CURRENCIES = ["ARS", "USD", "EUR", "MXN", "CLP", "COP", "BRL"];
