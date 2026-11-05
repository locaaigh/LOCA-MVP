import type {
  Business,
  CalendarItem,
  ContentFormat,
  ContentItem,
  ProductService,
  Strategy,
} from "../types";
import { isFormatEnabled, INDUSTRIES } from "../constants";
import { PIECE_PURPOSES, type PiecePurpose } from "./types";
import { INTERACTIVE_STORY_RULE, NO_REELS_RULE } from "./shared/validators";
import { resolveBrandStyle } from "./image/style-resolver";
import { STYLE_FAMILIES, TYPOGRAPHIC_TREATMENTS } from "./image/style-catalog";

// Formatos que hoy se pueden generar end-to-end (flag DISABLED_CONTENT_FORMATS).
// `ad` y `email` no son piezas del calendario orgánico: se excluyen del mes.
const CALENDAR_FORMATS: ContentFormat[] = ["post_estatico", "carrusel", "reel", "story"];
export const ENABLED_FORMATS = CALENDAR_FORMATS.filter(isFormatEnabled);

export const SYSTEM_EVA = `Sos Eva, la agente de marketing de LOCA ("Humanless marketing").
Generás estrategia y contenido de marketing de altísima calidad para micro y pequeñas empresas de Latinoamérica.

REGLAS DE VOZ (siempre):
- Respondé SIEMPRE en español rioplatense, usando "vos" (no "tú"). Natural, cercano, claro y profesional. Nada de relleno corporativo ni frases hechas de marketing.
- Escribí para ESTE negocio: usá sus productos, su ciudad, sus ventajas y su forma de hablar. Si el texto podría servir para cualquier otro negocio, está mal.
- Captions de 300 a 900 caracteres, con saltos de línea. Máximo 2 emojis por pieza, nunca al inicio del hook. Sin hashtags en ningún campo.
- Título, hook, caption, body y CTA aportan cosas distintas: no digas tres veces lo mismo.
- No prometas nada que el negocio no pueda cumplir (envíos, stock, resultados). No inventes datos, precios ni fechas que no estén en los datos del negocio.
- Nivel de venta: directo pero sin presión ni urgencia falsa, salvo que el propósito de la pieza sea "promo".

REGLAS DE FORMATO:
- ${NO_REELS_RULE}
- ${INTERACTIVE_STORY_RULE}
- El concepto visual (visualConcept) se escribe en INGLÉS, en 1 a 3 frases: qué se ve (sujeto, escena, acción, luz, mood). NUNCA incluyas texto, palabras, logos ni marcas dentro de la imagen: el texto de la pieza lo compone la app aparte.

- Devolvé SIEMPRE un único objeto JSON válido, sin markdown ni texto extra.`;

const PURPOSE_HELP: Record<PiecePurpose, string> = {
  venta: "muestra el producto/servicio para vender (imagen protagonista, copy que invita a comprar o consultar)",
  producto: "presenta un producto/servicio puntual y sus detalles",
  educativo: "enseña algo útil: tips, cómo se usa, errores comunes, mitos (va con texto sobre la imagen)",
  promo: "oferta, descuento, lanzamiento o combo, con condiciones claras (va con texto sobre la imagen)",
  testimonio: "prueba social: lo que dicen clientes, resultados, reseñas (va con texto sobre la imagen)",
  marca: "identidad, valores, por qué existe el negocio",
  fecha_especial: "efeméride o fecha del calendario del negocio, con titular corto sobre la imagen",
  detras_de_escena: "cómo se hace, el proceso, el lugar, el día a día",
  equipo: "las personas del negocio (si es un profesional independiente y no hay foto suya, sin rostros)",
};

function businessContext(b: Business): string {
  const ps = b.productsServices
    .map(
      (p) =>
        `- (${p.type}) ${p.name}${p.isTopSeller ? " [TOP SELLER]" : ""}: ${p.shortDescription || ""} ${
          p.priceMin ? `desde ${p.priceMin} ${p.currency}` : ""
        }${p.photos?.length ? ` [${p.photos.length} foto(s) reales de referencia]` : ""}`
    )
    .join("\n");
  const stage = b.businessStage
    ? {
        emprendimiento: "Emprendimiento (proyecto chico en crecimiento)",
        pyme: "Pyme establecida",
        startup: "Startup tecnológica",
        profesional_independiente: "Profesional independiente / marca personal",
      }[b.businessStage]
    : "";
  return `DATOS DEL NEGOCIO:
Nombre: ${b.name}
Industria: ${b.industry} / ${b.subcategory}
Tipo: ${b.businessType} | Modelo: ${b.businessModel}${stage ? ` | Organización: ${stage}` : ""}
Ubicación: ${b.city}, ${b.state}, ${b.country}
Descripción corta: ${b.shortDescription}
Descripción: ${b.fullDescription}
Valores: ${b.values.join(", ")}
Ventajas competitivas: ${b.competitiveAdvantages.join(", ")}
Canales: ${b.marketingChannels.join(", ")}${
    b.publishChannels?.length
      ? `\nCuentas donde publicar (elegidas por el negocio): ${b.publishChannels.join(", ")}`
      : ""
  }
Estacionalidad: ${b.seasonality}
Fechas especiales: ${b.specialDates.join(", ")}${
    b.personPhotos?.length ? `\nFoto real de la persona del negocio: sí (${b.personPhotos.length})` : ""
  }
Productos/Servicios:
${ps || "(sin cargar)"}
AUDIENCIA: edades ${b.audience.ageRanges.join(", ")}, género ${b.audience.gender}, nivel ${b.audience.socioeconomicLevel}, ubicación ${b.audience.locationLogic} (${b.audience.locations.join(", ")}). Dolores: ${b.audience.painPoints.join(
    ", "
  )}. Comportamiento: ${b.audience.behavior}. Segmentos: ${b.audience.segments.join(", ")}.
OBJETIVOS: objetivo de contenido = ${b.goals.primaryContentGoal}${
    b.goals.salesGoalType ? ` (${b.goals.salesGoalType})` : ""
  }. Objetivos negocio: ${b.goals.businessObjectives}. Métricas: ${b.goals.successMetrics.join(
    ", "
  )}. Objetivos marketing: ${b.goals.marketingObjectives}. Timeline: ${b.goals.timeline}.`;
}

// Contexto de marca para generación de contenido/imágenes (Brand Kit + BI + estilo resuelto).
export function brandContext(b: Business): string {
  const bk = b.brandKit;
  const bi = b.businessIntelligence;
  const parts: string[] = ["\nIDENTIDAD DE MARCA:"];
  if (bk?.colors?.palette?.length) {
    parts.push(`Colores: ${bk.colors.palette.map((c) => `${c.name} ${c.hex}`).join(", ")}.`);
  }
  const style = resolveBrandStyle(b);
  if (style.primaryFamily) {
    const fam = STYLE_FAMILIES[style.primaryFamily];
    const treat = TYPOGRAPHIC_TREATMENTS[style.typographicSystem ?? "minimal_serif"];
    parts.push(
      `Estilo visual de las imágenes: ${fam.label}${style.primaryVariant ? ` (variante ${style.primaryVariant})` : ""}. Piezas con texto: tratamiento "${treat.label}". Pensá los conceptos visuales para ese estilo.`
    );
  }
  if (bk?.visualStyle?.mood?.length) parts.push(`Mood: ${bk.visualStyle.mood.join(", ")}.`);
  if (bk?.voiceTone?.toneTags?.length) parts.push(`Tono de voz: ${bk.voiceTone.toneTags.join(", ")}.`);
  if (bk?.voiceTone?.formality) parts.push(`Formalidad: ${bk.voiceTone.formality}.`);
  if (bk?.brandKeywords?.length) parts.push(`Palabras clave de marca: ${bk.brandKeywords.join(", ")}.`);
  if (bk?.avoidList?.length) parts.push(`EVITAR (no usar): ${bk.avoidList.join("; ")}.`);
  if (bi?.primaryConversion?.type) parts.push(`Conversión principal: ${bi.primaryConversion.type}.`);
  if (bi?.recommendedGoal?.goal) parts.push(`Objetivo recomendado: ${bi.recommendedGoal.goal}.`);
  return parts.length > 1 ? parts.join("\n") : "";
}

export function strategyPrompt(b: Business, feedback?: string): string {
  return `${businessContext(b)}${brandContext(b)}
${feedback ? `\nAJUSTE PEDIDO POR EL USUARIO (aplicalo): "${feedback}"\n` : ""}
Generá una estrategia de marketing/contenido completa. Formatos disponibles hoy: ${ENABLED_FORMATS.join(", ")} (nada de reels ni video en el mix).
Devolvé EXACTAMENTE este JSON:
{
  "businessSummary": string,
  "brandPositioning": string,
  "audienceSummary": string,
  "mainAngle": string,
  "contentPillars": [{ "name": string, "description": string }],  // 3 a 5
  "toneOfVoice": string,
  "recommendedChannels": string[],  // usá EXACTAMENTE las "Cuentas donde publicar" si el negocio las eligió; si no, elegí entre: Instagram, Facebook, LinkedIn
  "monthlyGoal": string,
  "recommendedCta": string,
  "offerIdeas": string[],
  "dos": string[],   // 4 a 6. Cada uno CONCRETO y accionable para ESTE negocio, con un mini-ejemplo real después de un guion. Ej: "Mostrá el detrás de escena — ej: foto preparando un pedido".
  "donts": string[], // 4 a 6. Cada uno CONCRETO, con un mini-ejemplo de qué evitar después de un guion. Ej: "No uses jerga técnica — ej: evitá 'sinergia omnicanal B2B'".
  "keyMessages": string[],
  "contentMix": [{ "type": string, "percentage": number }],  // por propósito: ${PIECE_PURPOSES.join(", ")} (solo los que apliquen, suman 100)
  "nextActions": string[]
}`;
}

export function calendarPrompt(b: Business, s: Strategy, count: number, feedback?: string): string {
  const purposes = PIECE_PURPOSES.map((p) => `  - ${p}: ${PURPOSE_HELP[p]}`).join("\n");
  const mix = s.contentMix?.length ? s.contentMix.map((m) => `${m.type} ${m.percentage}%`).join(", ") : "(sin mix definido)";
  return `${businessContext(b)}${brandContext(b)}

ESTRATEGIA:
Ángulo: ${s.mainAngle}
Pilares: ${s.contentPillars.map((p) => `${p.name} (${p.description})`).join("; ")}
Tono: ${s.toneOfVoice}
Canales: ${s.recommendedChannels.join(", ")}
CTA: ${s.recommendedCta}
Mensajes clave: ${s.keyMessages?.join("; ") || "-"}
Mix sugerido por propósito: ${mix}
${feedback ? `\nAJUSTE PEDIDO POR EL USUARIO (aplicalo): "${feedback}"\n` : ""}
Generá un calendario de ${count} publicaciones para el próximo mes. Es un BRIEF por pieza: después otro paso escribe cada pieza, así que lo importante es que las ${count} sean distintas entre sí.

REGLAS:
- Usá SOLO estos formatos: ${ENABLED_FORMATS.join(", ")}. NO uses ningún otro (no hay carrusel ni reel por ahora${ENABLED_FORMATS.includes("story") ? "; las stories son imagen fija con texto" : ""}).
- Propósitos posibles y qué significan:
${purposes}
- Repartí los propósitos según el mix. Si no hay mix: ~40% venta/producto, ~25% educativo, ~15% promo, ~10% marca o detrás de escena, ~10% testimonio o fecha especial. Si el negocio tiene fechas especiales dentro del mes, incluilas con propósito fecha_especial.
- NINGUNA pieza repite ángulo ni idea de hook con otra. Variá pilares, productos y escenas.
- "visualConcept" en inglés, 1 a 3 frases, sin texto dentro de la imagen, pensado para el estilo visual de la marca.
- "needsTextOverlay" = true para educativo, promo, testimonio y fecha_especial (la app compone el texto sobre la imagen).

Devolvé EXACTAMENTE este JSON:
{
  "items": [
    {
      "dayOffset": number,        // días desde hoy (1..30), repartidos en el mes
      "suggestedTime": string,    // ej "18:30"
      "channel": string,          // ${s.recommendedChannels.join(" | ") || "Instagram | Facebook | LinkedIn"}
      "format": string,           // usar SOLO: ${ENABLED_FORMATS.join(" | ")}
      "contentPillar": string,
      "objective": string,        // Alcance | Engagement | Conversión
      "topic": string,            // tema concreto de la pieza
      "purpose": string,          // uno de: ${PIECE_PURPOSES.join(" | ")}
      "angle": string,            // el enfoque único de ESTA pieza (1 frase)
      "hookIdea": string,         // idea de hook, distinta a todas las demás
      "visualConcept": string,    // inglés, 1 a 3 frases, SIN texto en la imagen
      "needsTextOverlay": boolean
    }
  ]
}`;
}

/**
 * Bloque estable del prompt (negocio + marca + guía de la estrategia). Es
 * idéntico entre las piezas del mes, así que se pasa como cachePrefix para
 * prompt caching.
 */
export function stableContext(b: Business, s?: Strategy): string {
  return `${businessContext(b)}${brandContext(b)}${s ? strategyContext(s) : ""}`;
}

/** Guía de la estrategia que el contenido debe heredar (estable en el mes). */
export function strategyContext(s: Strategy): string {
  const parts = [
    "\nGUÍA DE LA ESTRATEGIA (respetar en cada pieza):",
    `Ángulo principal: ${s.mainAngle}.`,
    `Tono de voz: ${s.toneOfVoice}.`,
    `CTA recomendado: ${s.recommendedCta}.`,
  ];
  if (s.keyMessages?.length) parts.push(`Mensajes clave a reforzar: ${s.keyMessages.join("; ")}.`);
  if (s.dos?.length) parts.push(`HACER: ${s.dos.join("; ")}.`);
  if (s.donts?.length) parts.push(`NO HACER: ${s.donts.join("; ")}.`);
  return parts.join("\n");
}

const OVERLAY_JSON = `"overlay": {            // texto que la app compone SOBRE la imagen con la fuente de marca. Exacto, corto, con tildes.
    "headline": string,       // máx 70 caracteres
    "subheadline": string,    // opcional, máx 120
    "price": string,          // opcional, solo si hay precio real en los datos (ej "$12.900")
    "cta": string             // opcional, máx 30 (ej "Escribinos por WhatsApp")
  }`;

/** Parte variable del prompt de contenido (la pieza puntual). Va después del cachePrefix. */
export function contentBriefPrompt(item: CalendarItem, opts?: { previousHooks?: string[] }): string {
  const purpose = item.purpose ?? "marca";
  const needsOverlay = item.needsTextOverlay ?? ["educativo", "promo", "testimonio", "fecha_especial"].includes(purpose);
  const isStory = item.format === "story";
  const prev = opts?.previousHooks?.filter(Boolean).slice(-12) ?? [];
  return `
PIEZA A GENERAR:
Canal: ${item.channel} | Formato: ${item.format} | Pilar: ${item.contentPillar} | Objetivo: ${item.objective}
Propósito: ${purpose} (${PURPOSE_HELP[purpose]})
Tema: ${item.topic}
${item.angle ? `Ángulo de esta pieza: ${item.angle}` : ""}
${item.hookIdea ? `Idea de hook: ${item.hookIdea}` : ""}
${item.visualConcept ? `Concepto visual del brief: ${item.visualConcept}` : ""}
${prev.length ? `\nHOOKS YA USADOS ESTE MES (no los repitas ni parecidos):\n${prev.map((h) => `- ${h}`).join("\n")}` : ""}
${isStory ? `\nES UNA STORY: imagen fija 9:16. ${INTERACTIVE_STORY_RULE} El texto va en "overlay" (obligatorio), corto y grande. El caption de una story no se publica: dejalo igual pero breve.` : ""}

REGLAS DE ESCRITURA:
- NO uses hashtags (no incluyas "#..." en ningún campo).
- Título, hook, caption, body y CTA aportan cosas distintas.
- Caption fluido y natural, sin relleno. "body" = desarrollo opcional (puede ir vacío si el caption ya dice todo).
- "visualConcept": en inglés, 1 a 3 frases. Qué se ve, escena, acción, luz, mood. SIN texto, letras, logos ni marcas. Si el negocio tiene fotos reales del producto o de la persona, describí la escena alrededor de ESE producto/persona (la app las usa como referencia).
${
    needsOverlay
      ? '- Esta pieza LLEVA texto sobre la imagen: completá "overlay" con un titular exacto y corto (lo que el usuario ve en grande; puede ser distinto al hook). Y el "visualConcept" tiene que describir un FONDO simple: UN solo elemento de apoyo (ej. el producto en una esquina, una taza, una textura) sobre superficie lisa o con poca textura, con 60% de espacio vacío. Nada de escenas cargadas ni muchos objetos.'
      : '- Esta pieza NO lleva texto sobre la imagen: poné "overlay": null.'
  }

Devolvé EXACTAMENTE este JSON:
{
  "title": string,
  "caption": string,
  "hook": string,
  "body": string,
  "cta": string,
  "visualConcept": string,
  "suggestedLayout": string,
  "designTextOverlay": string,  // mismo texto que overlay.headline, o "" si no lleva
  "assetNotes": string,
  ${needsOverlay ? OVERLAY_JSON : '"overlay": null'},
  "photoBrief": { "idea": string, "shotList": string[], "props": string[], "composition": string }  // por si el negocio quiere sacar la foto real
}`;
}

export function feedbackPrompt(b: Business, item: ContentItem, feedbackText: string): string {
  const needsOverlay = !!item.overlay;
  return `${businessContext(b)}${brandContext(b)}

PIEZA ACTUAL (JSON):
${JSON.stringify(
    {
      format: item.format,
      channel: item.channel,
      purpose: item.purpose,
      title: item.title,
      caption: item.caption,
      hook: item.hook,
      body: item.body,
      cta: item.cta,
      visualConcept: item.visualConcept,
      overlay: item.overlay ?? null,
    },
    null,
    2
  )}

INSTRUCCIÓN DE AJUSTE DEL USUARIO: "${feedbackText}"

Regenerá la pieza aplicando el ajuste, manteniendo coherencia con la marca y el propósito. NO uses hashtags ni repitas la misma idea en varios campos.
${item.format === "story" ? INTERACTIVE_STORY_RULE : ""}
Si el ajuste pide cambiar la imagen, la escena o el estilo visual, cambiá "visualConcept" (inglés, sin texto en la imagen) y poné "imageChangeRequested": true; si no, dejá visualConcept igual y "imageChangeRequested": false.
Devolvé EXACTAMENTE este JSON:
{
  "title": string,
  "caption": string,
  "hook": string,
  "body": string,
  "cta": string,
  "visualConcept": string,
  "suggestedLayout": string,
  "designTextOverlay": string,
  "assetNotes": string,
  ${needsOverlay ? OVERLAY_JSON : '"overlay": null'},
  "imageChangeRequested": boolean
}`;
}

/** Carrusel: narrativa de 2 a 8 slides con rol, mismo estilo y mismas referencias. */
export function carouselPrompt(item: CalendarItem, slideCount: number): string {
  const purpose = item.purpose ?? "educativo";
  return `
CARRUSEL A GENERAR (${slideCount} slides, 4:5 todas):
Canal: ${item.channel} | Pilar: ${item.contentPillar} | Objetivo: ${item.objective}
Propósito: ${purpose} (${PURPOSE_HELP[purpose]})
Tema: ${item.topic}
${item.angle ? `Ángulo: ${item.angle}` : ""}
${item.hookIdea ? `Idea de hook: ${item.hookIdea}` : ""}

REGLAS:
- Slide 1 = "portada" (hook fuerte, invita a deslizar). Slides del medio = "punto" (una idea por slide). Última = "cierre" con CTA.
- Cada slide tiene su "visualConcept" en inglés (1 a 2 frases, misma escena/estilo/paleta en todas, SIN texto en la imagen) y su "overlay" (titular corto exacto que la app compone sobre la imagen; "subheadline" opcional).
- El caption es UNO solo para todo el post. Sin hashtags.
- Nada de reels, video, encuestas ni stickers.

Devolvé EXACTAMENTE este JSON:
{
  "title": string,
  "caption": string,
  "hook": string,
  "cta": string,
  "slides": [
    { "role": "portada" | "punto" | "cierre", "visualConcept": string, "overlay": { "headline": string, "subheadline": string, "cta": string } }
  ]
}`;
}

export function metaAdsPrompt(b: Business): string {
  return `${businessContext(b)}${brandContext(b)}

Generá una estrategia de Meta Ads (Facebook/Instagram). NO crees campañas reales, solo la estrategia.
Devolvé EXACTAMENTE este JSON:
{
  "campaignObjective": string,
  "funnelStage": string,
  "audiences": string[],
  "interests": string[],
  "adAngles": string[],
  "copyVariants": string[],   // 3
  "headlines": string[],      // 3
  "ctas": string[],           // 3
  "creativeSuggestions": string[],
  "budgetRecommendation": string,
  "destination": string
}`;
}

// Análisis estructurado de la web (IA real). Recibe contenido ya extraído.
export function websiteAnalysisPrompt(input: {
  url: string;
  title: string;
  description: string;
  headings: string[];
  paragraphs: string[];
  buttons: string[];
  socials: string[];
  text: string;
}): string {
  return `Sos una analista de negocios senior. NO sos un parser que copia texto: tu trabajo es RAZONAR sobre el negocio real detrás de esta web y completar un formulario de marketing con criterio.

URL: ${input.url}
TÍTULO: ${input.title}
DESCRIPCIÓN: ${input.description}
TITULARES: ${input.headings.slice(0, 20).join(" | ")}
PÁRRAFOS: ${input.paragraphs.slice(0, 12).join(" ")}
BOTONES: ${input.buttons.slice(0, 15).join(" | ")}
REDES DETECTADAS: ${input.socials.join(", ") || "(ninguna)"}
TEXTO (parcial):
"""
${input.text.slice(0, 6000)}
"""

${WEBSITE_REASONING_RULES}

Devolvé EXACTAMENTE este JSON:
${WEBSITE_JSON_SHAPE}`;
}

const WEBSITE_REASONING_RULES = `CÓMO PENSAR (clave):
- Razoná el negocio REAL: qué vende, a quién, cómo gana plata. No copies literal un titular de marketing.
- "A quién le vende" (businessModel): pensá quién PAGA. Si el texto dice que ayuda a "empresas", "pymes", "comercios", "equipos" o "profesionales", es B2B — aunque también mencione consumidores. No pongas B2C por default.
- Producto vs servicio: un SERVICIO es trabajo/tiempo/asesoría/atención recurrente (consultoría, mantenimiento, diseño, clases, instalación). Un PRODUCTO es un bien tangible o digital que se compra una vez. Si la web habla de "soluciones", "acompañamiento", "gestión", "implementación" → probablemente SERVICIOS, no productos. No clasifiques todo como producto.
- Industria: en "industry" tenés que elegir OBLIGATORIAMENTE UNA de esta lista EXACTA, copiando el texto tal cual (está en inglés, NO lo traduzcas): ${INDUSTRIES.join(" · ")}. Elegí la que mejor encaje con el negocio real. En "options" de industry ofrecé 2 a 4 alternativas de ESTA MISMA lista. Nunca inventes una industria fuera de la lista ni la escribas en español.
- Subcategoría: inferí la subcategoría real del negocio (texto libre, en español, está bien).

REGLA DE CONFIANZA (muy importante — evita inventar):
- Para CADA campo, estimá tu confianza en "confidence": "high" | "medium" | "low".
- Si NO estás seguro de industry, subcategory o businessModel, NO adivines uno solo: poné tu mejor opción en el campo, marcá confidence "low" o "medium", y ofrecé 3 a 5 alternativas razonables en "options".
- Si no hay ninguna señal en la web para un campo, dejalo "" o [] con confidence "low". Preferí vacío honesto antes que un genérico inventado.
- NO inventes colores ni tipografías (eso se detecta aparte). Acá solo describís mood/estilo si la web lo sugiere.

Reglas de forma:
- En español rioplatense (vos).
- Respondé SOLO el JSON.`;

const WEBSITE_JSON_SHAPE = `{
  "industry": string,
  "subcategory": string,
  "businessType": string,            // Local físico | Online | Híbrido (físico + online) | Servicios a domicilio | Marca personal
  "businessModel": string,           // B2B | B2C | Ambos
  "country": string,
  "state": string,
  "city": string,
  "shortDescription": string,        // 1 frase clara
  "fullDescription": string,         // 2-3 frases
  "values": string[],
  "competitiveAdvantages": string[],
  "marketingActivities": string[],
  "seasonalityTags": string[],       // temporadas fuertes reales según la web (ej: "verano", "vuelta al cole"). [] si no hay señal clara.
  "specialDates": string[],          // fechas/eventos propios del negocio (ej: aniversario, lanzamientos). NO metas fechas comerciales genéricas (hot sale, cyber monday) salvo que la web las mencione explícitamente. [] si no hay.
  "avoidList": string[],             // SOLO cosas que la marca evita comunicar según SU web (ej: "no hablan de precio", "evitan lenguaje técnico"). NUNCA pongas acá fechas, temporadas ni promociones. [] si no hay señal.
  "products": [{ "name": string, "type": "producto" | "servicio", "category": string, "shortDescription": string, "price": number, "currency": string, "isTopSeller": boolean }],
  "audience": { "ageRanges": string[], "gender": string, "socioeconomicLevel": string, "segments": string[], "painPoints": string[], "behavior": string },
  "toneTags": string[],              // ej: cercana, premium, divertida, profesional…
  "formality": string,               // informal | neutral | formal
  "visualMood": string[],            // ej: moderno, cálido, minimalista
  "imageStyle": string,
  "designNotes": string,
  "valuePropositions": string[],     // 3 a 5: ¿por qué elegir esta marca?
  "primaryConversion": string,       // Compra ecommerce | Mensaje por WhatsApp | Reserva | Visita al local | Formulario | Lead magnet | Consulta por DM
  "recommendedGoal": string,
  "recommendedGoalReason": string,
  "brandKeywords": string[],
  "whatEvaUnderstood": string,       // 1-2 frases: qué entendió Eva del negocio
  "confidence": {                    // confianza POR campo. Omití los que no apliquen.
    "industry": "high" | "medium" | "low",
    "subcategory": "high" | "medium" | "low",
    "businessModel": "high" | "medium" | "low",
    "businessType": "high" | "medium" | "low",
    "shortDescription": "high" | "medium" | "low",
    "products": "high" | "medium" | "low"
  },
  "options": {                       // 3 a 5 alternativas cuando no estés seguro. [] o ausente si tenés confianza alta.
    "industry": string[],
    "subcategory": string[],
    "businessModel": string[]
  }
}`;

/**
 * Plan B: lectura VISUAL de la web. Recibe capturas de pantalla (y el poco
 * texto que se haya podido leer) y devuelve lo mismo que el análisis por HTML
 * más logo, paleta y tipografías observadas en pantalla.
 */
export function websiteVisionPrompt(input: { url: string; pages: string[]; textHint: string }): string {
  return `Sos una analista de negocios senior. Te paso CAPTURAS DE PANTALLA de la web de un negocio (${input.pages.length} página(s): ${input.pages.join(", ")}) porque no se pudo leer bien el HTML. Mirá las imágenes con atención y completá el formulario de marketing RAZONANDO sobre el negocio real.

URL: ${input.url}
${input.textHint ? `TEXTO PARCIAL QUE SÍ SE PUDO LEER:\n"""\n${input.textHint.slice(0, 3000)}\n"""` : "(no se pudo leer texto del HTML)"}

ADEMÁS de los campos del formulario, observá la identidad visual en pantalla:
- "logoDescription": describí el logo (texto, forma, colores, posición) y "logoText" si es un logotipo con texto.
- "colorsSeen": 3 a 6 colores dominantes de la marca en HEX aproximado, con rol (primary | secondary | accent | background | text). Solo colores que claramente son de la marca (botones, titulares, fondos), no de fotos.
- "fontsSeen": estilo de las tipografías de titulares y texto (serif | sans | display | script | mono) y, si la reconocés con seguridad, el nombre de la familia.
- "productsSeen": productos o servicios visibles en pantalla con precio si se ve.

${WEBSITE_REASONING_RULES}

Devolvé EXACTAMENTE este JSON (los campos del formulario igual que siempre, más los visuales):
${WEBSITE_JSON_SHAPE.replace(
    /\n\}$/,
    `,
  "logoDescription": string,
  "logoText": string,
  "colorsSeen": [{ "hex": string, "role": "primary" | "secondary" | "accent" | "background" | "text", "name": string }],
  "fontsSeen": { "heading": { "style": string, "family": string }, "body": { "style": string, "family": string } },
  "productsSeen": [{ "name": string, "type": "producto" | "servicio", "price": number, "currency": string }]
}`
  )}`;
}

export function extractWebsitePrompt(url: string, pageText: string): string {
  return `Te paso el texto de la página web de un negocio. Extraé la información del negocio para prellenar un formulario.
URL: ${url}

TEXTO DE LA WEB (puede estar incompleto):
"""
${pageText.slice(0, 6000)}
"""

Devolvé EXACTAMENTE este JSON (dejá vacío "" o [] lo que no puedas inferir con confianza, NO inventes):
{
  "name": string,
  "industry": string,
  "subcategory": string,
  "shortDescription": string,
  "fullDescription": string,
  "products": [{ "type": "producto" | "servicio", "name": string, "shortDescription": string }],
  "socialChannels": string[],   // ej: Instagram, Facebook, TikTok, WhatsApp
  "tone": string,
  "country": string,
  "city": string,
  "competitiveAdvantages": string[]
}`;
}

export function productDescriptionPrompt(b: Business, draft: ProductService): string {
  return `${businessContext(b)}

Generá la descripción de este ${draft.type} para ${b.name}.
DATOS PARCIALES:
Nombre: ${draft.name || "(sin nombre)"}
Categoría: ${draft.category || ""}
Notas: ${draft.shortDescription || draft.longDescription || ""}
Features actuales: ${draft.features.join(", ")}

Devolvé EXACTAMENTE este JSON, en español rioplatense (vos), claro y vendedor pero honesto:
{
  "shortDescription": string,   // 1 frase
  "longDescription": string,    // 2-3 frases
  "features": string[],         // 3-5 características/beneficios
  "keywords": string[]          // 4-6 palabras clave de búsqueda
}`;
}

export function googleAdsPrompt(b: Business): string {
  return `${businessContext(b)}${brandContext(b)}

Generá una estrategia de Google Ads. NO crees campañas reales.
Devolvé EXACTAMENTE este JSON:
{
  "campaignType": string,
  "searchIntent": string,
  "keywords": string[],
  "negativeKeywords": string[],
  "copyVariants": string[],
  "landingSuggestion": string,
  "budgetRecommendation": string
}`;
}
