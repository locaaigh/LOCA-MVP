// ─────────────────────────────────────────────────────────────
// Generadores MOCK "inteligentes" — usados cuando no hay OPENAI_API_KEY.
// Toman el contexto real del negocio para producir contenido coherente,
// en español y con tono cercano (vos).
// ─────────────────────────────────────────────────────────────
import type {
  Business,
  CalendarItem,
  ContentItem,
  GoogleAdsStrategy,
  MetaAdsStrategy,
  Strategy,
  Channel,
  ContentFormat,
  ImageFormat,
} from "../types";
import { spreadDates, uid, nowIso } from "../utils";

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function topSeller(b: Business): string {
  const top = b.productsServices.find((p) => p.isTopSeller) || b.productsServices[0];
  return top?.name || b.name;
}

function mainGoalText(b: Business): string {
  switch (b.goals.primaryContentGoal) {
    case "ventas":
      return "aumentar ventas";
    case "confianza":
      return "construir confianza y autoridad";
    default:
      return "ganar visibilidad y alcance";
  }
}

function ctaForGoal(b: Business): string {
  switch (b.goals.salesGoalType) {
    case "compra_ecommerce":
      return "Comprá online ahora";
    case "mensaje_whatsapp":
      return "Escribinos por WhatsApp";
    case "visita_local":
      return "Visitanos hoy";
    case "lead_magnet":
      return "Descargá la guía gratis";
    default:
      return b.goals.primaryContentGoal === "ventas"
        ? "Conocé más y comprá"
        : "Seguinos para más";
  }
}

// ── Estrategia ───────────────────────────────────────────────
const PUBLISH_CHANNELS: Channel[] = ["Instagram", "Facebook", "TikTok", "LinkedIn"];

export function mockStrategy(b: Business): Strategy {
  // marketingChannels puede tener canales ampliados (WhatsApp, X, etc.):
  // para los canales recomendados de publicación nos quedamos con los válidos.
  const fromBiz = b.marketingChannels.filter((c): c is Channel =>
    PUBLISH_CHANNELS.includes(c as Channel)
  );
  const channels: Channel[] = fromBiz.length ? fromBiz : ["Instagram", "Facebook"];
  const vals = b.values.length ? b.values : ["Calidad", "Atención al cliente"];
  const adv = b.competitiveAdvantages[0] || "atención personalizada";

  const pillars = [
    {
      name: "Detrás de escena",
      description: `Mostrá el día a día de ${b.name}: el proceso, las personas y el cuidado por el detalle. Genera cercanía y confianza.`,
    },
    {
      name: "Producto / servicio estrella",
      description: `Poné en valor ${topSeller(b)} y todo lo que ofrecés, destacando ${adv.toLowerCase()}.`,
    },
    {
      name: "Educación y tips",
      description: `Contenido útil que resuelve dudas de tu audiencia y posiciona a ${b.name} como referente.`,
    },
    {
      name: "Comunidad y prueba social",
      description: "Testimonios, reseñas y contenido generado por clientes para reforzar credibilidad.",
    },
    {
      name: "Ofertas y novedades",
      description: "Promos, lanzamientos y fechas especiales para activar la conversión.",
    },
  ];

  return {
    id: uid("str"),
    businessId: b.id,
    businessSummary: `${b.name} es un negocio de ${b.industry}${
      b.subcategory ? ` (${b.subcategory})` : ""
    } en ${b.city || b.country}. ${b.shortDescription || b.fullDescription || ""}`.trim(),
    brandPositioning: `Una marca ${vals
      .slice(0, 3)
      .join(", ")
      .toLowerCase()} que se diferencia por ${adv.toLowerCase()}. El posicionamiento apunta a ser la opción ${
      b.businessModel === "B2B" ? "confiable para empresas" : "preferida y cercana"
    } en su categoría.`,
    audienceSummary: `Audiencia ${b.audience.gender === "todos" ? "amplia" : b.audience.gender}, principalmente ${
      b.audience.ageRanges.join(", ") || "25-44"
    }, nivel ${b.audience.socioeconomicLevel.replace("_", "-")}. ${
      b.audience.painPoints[0] ? `Busca resolver: ${b.audience.painPoints.join(", ")}.` : ""
    }`,
    mainAngle: `Comunicar cómo ${b.name} hace la vida más fácil/mejor a través de ${adv.toLowerCase()}, con un tono humano y consistente para ${mainGoalText(
      b
    )}.`,
    contentPillars: pillars.slice(0, 5),
    toneOfVoice: `Cercano, claro y profesional. Hablamos de vos. ${
      b.values.includes("Tendencia / moda") ? "Con un toque fresco y actual." : ""
    }`.trim(),
    recommendedChannels: channels,
    monthlyGoal: `Publicar de forma constante (16 piezas/mes) para ${mainGoalText(b)} y crecer la comunidad de forma sostenida.`,
    recommendedCta: ctaForGoal(b),
    offerIdeas: [
      `Promo de bienvenida para nuevos clientes de ${b.name}`,
      `Combo destacado con ${topSeller(b)}`,
      "Beneficio por recomendar a un amigo",
      "Descuento por tiempo limitado en fechas especiales",
    ],
    dos: [
      "Mantener identidad visual consistente",
      "Responder comentarios y mensajes rápido",
      "Mostrar personas reales y casos reales",
      "Incluir siempre un CTA claro",
    ],
    donts: [
      "Publicar sin objetivo definido",
      "Usar imágenes genéricas de stock que no representen la marca",
      "Saturar con promociones agresivas",
      "Copiar el tono de la competencia sin diferenciarse",
    ],
    keyMessages: [
      `${b.name}: ${b.shortDescription || mainGoalText(b)}`,
      `Lo que nos diferencia: ${adv}`,
      `${ctaForGoal(b)}`,
    ],
    contentMix: [
      { type: "Educativo / valor", percentage: 35 },
      { type: "Producto / venta", percentage: 30 },
      { type: "Comunidad / prueba social", percentage: 20 },
      { type: "Detrás de escena", percentage: 15 },
    ],
    nextActions: [
      "Generar el calendario del mes",
      "Producir las primeras piezas y revisar el tono",
      "Definir 1-2 ofertas para activar conversión",
      "Configurar una campaña simple de Ads para amplificar lo que mejor funcione",
    ],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

// ── Calendario ───────────────────────────────────────────────
const FORMAT_ROTATION: ContentFormat[] = [
  "post_estatico",
  "reel",
  "carrusel",
  "story",
  "post_estatico",
  "reel",
];

export function mockCalendar(
  b: Business,
  strategy: Strategy,
  count: number
): CalendarItem[] {
  const dates = spreadDates(count);
  const channels = strategy.recommendedChannels.length
    ? strategy.recommendedChannels
    : (["Instagram"] as Channel[]);
  const pillars = strategy.contentPillars;
  const times = ["09:00", "13:00", "18:30", "20:00"];

  const topics = [
    `Presentamos ${topSeller(b)}`,
    `Tip útil para tu día relacionado con ${b.industry}`,
    `Detrás de escena en ${b.name}`,
    "Testimonio de un cliente feliz",
    `Por qué elegir ${b.name}: ${b.competitiveAdvantages[0] || "nuestra diferencia"}`,
    "Pregunta a la comunidad / encuesta",
    "Novedad de la semana",
    "Mini guía paso a paso",
    `Promo especial: ${strategy.offerIdeas[0] || "beneficio del mes"}`,
    "Antes y después / resultado real",
    "Conocé al equipo",
    "Errores comunes que evitamos",
    `Lo más pedido: ${topSeller(b)}`,
    "Inspiración y casos de uso",
    "Respondemos sus preguntas frecuentes",
    "Recordatorio + CTA fuerte",
    "Curiosidad del rubro",
    "Detalle de calidad / materiales",
    "Comparativa: nuestra forma de hacerlo",
    "Cierre de mes / agradecimiento a la comunidad",
  ];

  return dates.map((date, i) => {
    const pillar = pick(pillars, i);
    return {
      id: uid("cal"),
      businessId: b.id,
      strategyId: strategy.id,
      date,
      suggestedTime: pick(times, i),
      channel: pick(channels, i),
      format: pick(FORMAT_ROTATION, i),
      contentPillar: pillar.name,
      objective:
        i % 3 === 0 ? "Conversión" : i % 3 === 1 ? "Alcance" : "Engagement",
      topic: pick(topics, i),
      status: "generado",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
  });
}

// ── Contenido ────────────────────────────────────────────────
export function mockContent(
  b: Business,
  strategy: Strategy,
  item: CalendarItem
): Omit<ContentItem, "imageUrl" | "imageStatus" | "imageProvider" | "imageError"> {
  const adv = b.competitiveAdvantages[0] || "lo que nos hace únicos";
  const cta = strategy.recommendedCta || ctaForGoal(b);
  const product = topSeller(b);
  const hook = hookFor(item, b);

  const base = {
    id: uid("cnt"),
    businessId: b.id,
    calendarItemId: item.id,
    title: `${item.contentPillar} — ${item.topic}`,
    caption: `${hook}\n\nEn ${b.name} ${b.shortDescription || "hacemos las cosas distinto"}. ${item.topic}. ${adv ? `Lo que nos diferencia: ${adv}.` : ""}\n\n${cta} 👉`,
    hook,
    body: `${item.topic}. Te contamos por qué ${product} es ideal para vos y cómo ${b.name} cuida cada detalle. ${
      b.values[0] ? `Creemos en ${b.values[0].toLowerCase()}.` : ""
    }`,
    cta,
    hashtags: hashtagsFor(b, item),
    visualConcept: visualConceptFor(item, b),
    imagePrompt: imagePromptFor(item, b),
    imageFormat: (item.format === "story" || item.format === "reel" ? "9:16" : "4:5") as ImageFormat,
    suggestedLayout:
      item.format === "carrusel"
        ? "Carrusel de 5 slides: portada con hook, 3 slides de valor, slide final con CTA."
        : "Imagen principal con foco en el producto/servicio + texto corto y CTA abajo.",
    designTextOverlay: hook.length > 40 ? hook.slice(0, 40) + "…" : hook,
    assetNotes: `Usar paleta de marca${
      b.brandColors.length ? ` (${b.brandColors.join(", ")})` : " (rosa/lima)"
    }. Mantener logo en una esquina. Evitar texto largo dentro de la imagen.`,
    channel: item.channel,
    format: item.format,
    objective: item.objective,
    contentPillar: item.contentPillar,
    status: "generado" as const,
    publishStatus: "pendiente" as const,
    feedbackHistory: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  // Extras según formato
  if (item.format === "reel") {
    return {
      ...base,
      videoScript: {
        concept: `Reel dinámico de 15-30s mostrando ${product} en acción para ${item.objective.toLowerCase()}.`,
        durationSeconds: 20,
        scenes: [
          {
            scene: "Plano de apertura llamativo del producto/servicio",
            onScreenText: hook,
            voiceover: `¿Sabías que en ${b.name} ${b.shortDescription || "lo hacemos distinto"}?`,
          },
          {
            scene: "Detalle / proceso / uso real",
            onScreenText: adv,
            voiceover: `Por eso elegimos cuidar ${b.values[0]?.toLowerCase() || "cada detalle"}.`,
          },
          {
            scene: "Resultado final + cliente feliz",
            onScreenText: cta,
            voiceover: `${cta}. Te esperamos.`,
          },
        ],
        music: "Pista trend del momento, ritmo medio-alto, alegre.",
        cta,
      },
    };
  }

  if (item.contentPillar.toLowerCase().includes("escena") || item.objective === "Engagement") {
    return {
      ...base,
      photoBrief: {
        idea: `Foto auténtica que muestre ${product} y el ambiente de ${b.name}.`,
        shotList: [
          "Plano general del espacio / producto",
          "Detalle macro (textura, calidad)",
          "Persona usando o disfrutando el producto/servicio",
        ],
        props: ["Producto estrella", "Elementos de marca", "Luz natural"],
        composition: "Regla de tercios, fondo limpio, foco en el producto, espacio para texto.",
      },
    };
  }

  return base;
}

function hookFor(item: CalendarItem, b: Business): string {
  const hooks = [
    `Esto cambia tu forma de ver ${b.industry.toLowerCase()} 👀`,
    `Lo que nadie te cuenta sobre ${b.name}`,
    `3 razones para elegir ${topSeller(b)}`,
    "Pará todo y leé esto 🛑",
    `Si buscás ${b.subcategory || "calidad"}, esto es para vos`,
    "El secreto está en el detalle ✨",
    `Hoy en ${b.name}…`,
    "¿Te pasa esto? Tenemos la solución 👇",
  ];
  return pick(hooks, item.topic.length + item.date.length);
}

function hashtagsFor(b: Business, item: CalendarItem): string[] {
  const base = [
    b.name.replace(/\s+/g, ""),
    b.city.replace(/\s+/g, ""),
    b.subcategory?.replace(/\s+/g, "") || "",
    item.contentPillar.replace(/\s+/g, ""),
  ].filter(Boolean);
  const generic = ["marketing", "negociolocal", "emprender", "calidad", "comunidad"];
  return [...base, ...generic].slice(0, 8).map((t) => `#${t.toLowerCase()}`);
}

function visualConceptFor(item: CalendarItem, b: Business): string {
  return `${item.format === "reel" ? "Video vertical" : "Imagen"} con estética de ${b.name}: foco en ${topSeller(
    b
  )}, paleta de marca, iluminación cuidada y composición limpia que deje espacio para el texto.`;
}

export function imagePromptFor(item: CalendarItem, b: Business): string {
  const adv = b.competitiveAdvantages[0] || "calidad";
  return [
    `Fotografía profesional de marketing para "${b.name}", un negocio de ${b.industry}${
      b.subcategory ? ` (${b.subcategory})` : ""
    }.`,
    `Tema: ${item.topic}.`,
    `Mostrar ${topSeller(b)} de forma atractiva, iluminación natural y suave, composición limpia y moderna,`,
    `paleta acorde a la marca, estilo aspiracional pero cercano que transmita ${adv.toLowerCase()}.`,
    `Sin texto incrustado en la imagen. Foto realista, alta calidad, apta para redes sociales.`,
  ].join(" ");
}

// ── Ads ──────────────────────────────────────────────────────
export function mockMetaAds(b: Business): MetaAdsStrategy {
  const dest =
    b.goals.salesGoalType === "mensaje_whatsapp"
      ? "WhatsApp"
      : b.goals.salesGoalType === "compra_ecommerce"
        ? "Tienda / ecommerce"
        : b.goals.salesGoalType === "visita_local"
          ? "Visita al local"
          : "Landing page";
  return {
    campaignObjective:
      b.goals.primaryContentGoal === "ventas" ? "Ventas / Conversiones" : "Reconocimiento / Tráfico",
    funnelStage: b.goals.primaryContentGoal === "ventas" ? "Consideración → Conversión" : "Awareness",
    audiences: [
      `${b.audience.ageRanges.join(", ") || "25-44"} en ${b.audience.locations.join(", ") || b.city || b.country}`,
      "Públicos similares (Lookalike) a clientes actuales",
      "Retargeting de quienes visitaron el perfil o la web",
    ],
    interests: [
      b.industry,
      b.subcategory || "compras locales",
      ...(b.values.slice(0, 2)),
      "marcas relacionadas del rubro",
    ].filter(Boolean),
    adAngles: [
      `Beneficio principal: ${b.competitiveAdvantages[0] || "calidad superior"}`,
      "Prueba social / testimonios",
      "Oferta por tiempo limitado",
    ],
    copyVariants: [
      `En ${b.name} ${b.shortDescription || "hacemos las cosas mejor"}. Descubrí ${topSeller(b)}.`,
      `¿Buscás ${b.subcategory || "lo mejor"}? Te lo damos con ${b.competitiveAdvantages[0]?.toLowerCase() || "calidad"}. Probá ${b.name}.`,
      `Miles confían en ${b.name}. Sumate y comprobá la diferencia.`,
    ],
    headlines: [
      `${b.name}: ${b.competitiveAdvantages[0] || "la mejor opción"}`,
      `Descubrí ${topSeller(b)}`,
      "Oferta especial por tiempo limitado",
    ],
    ctas: ["Comprar ahora", "Enviar mensaje", "Más información"],
    creativeSuggestions: [
      "Video corto vertical mostrando el producto en uso",
      "Carrusel con beneficios + prueba social",
      "Imagen única con oferta clara y CTA visible",
    ],
    budgetRecommendation:
      "Empezá con USD 5-10/día durante 7 días para testear creativos; escalá lo que mejor CPA tenga.",
    destination: dest,
  };
}

export function mockGoogleAds(b: Business): GoogleAdsStrategy {
  return {
    campaignType:
      b.businessModel === "B2C" && b.goals.salesGoalType === "compra_ecommerce"
        ? "Search + Performance Max"
        : "Search (Red de búsqueda)",
    searchIntent: `Personas buscando ${b.subcategory || b.industry} en ${b.city || b.country} con intención de ${intentVerb(
      b
    )}.`,
    keywords: [
      `${b.subcategory || b.industry} ${b.city}`.trim(),
      `${topSeller(b)} ${b.city}`.trim(),
      `mejor ${b.subcategory || b.industry}`,
      `${b.name}`,
      `comprar ${b.subcategory || "online"}`,
    ].filter(Boolean),
    negativeKeywords: ["gratis", "empleo", "trabajo", "barato dudoso", "diy hazlo tú mismo"],
    copyVariants: [
      `${b.name} | ${b.competitiveAdvantages[0] || "Calidad garantizada"} | Pedí hoy`,
      `${b.subcategory || b.industry} en ${b.city} | ${b.name} | ${strategyCtaShort(b)}`,
      `Descubrí ${topSeller(b)} | Atención personalizada | ${b.name}`,
    ],
    landingSuggestion:
      "Landing simple y rápida: propuesta de valor arriba, beneficios, prueba social y un CTA claro repetido. Optimizada para mobile.",
    budgetRecommendation:
      "Comenzá con USD 8-15/día en búsqueda, enfocado en 1-2 grupos de anuncios bien segmentados.",
  };
}

function strategyCtaShort(b: Business): string {
  switch (b.goals.salesGoalType) {
    case "mensaje_whatsapp":
      return "Escribinos";
    case "visita_local":
      return "Visitanos";
    case "compra_ecommerce":
      return "Comprá online";
    default:
      return "Más info";
  }
}

function intentVerb(b: Business): string {
  switch (b.goals.primaryContentGoal) {
    case "ventas":
      return "comprar";
    case "confianza":
      return "informarse";
    default:
      return "descubrir";
  }
}
