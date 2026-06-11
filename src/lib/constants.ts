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
export const SEASONALITY_OPTIONS: string[] = [
  "Verano",
  "Invierno",
  "Primavera",
  "Otoño",
  "Vuelta a clases",
  "Día de la Madre",
  "Día del Padre",
  "Navidad",
  "Año Nuevo",
  "Hot Sale / Cyber Monday",
  "Vacaciones",
  "Fechas turísticas",
  "Otra",
];

// Fechas especiales importantes
export const SPECIAL_DATES_OPTIONS: string[] = [
  "Aniversario de la marca",
  "Lanzamientos",
  "Fechas comerciales",
  "Eventos propios",
  "Temporadas de descuentos",
  "Ferias / exposiciones",
  "Fechas patrias",
  "Otra",
];

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
