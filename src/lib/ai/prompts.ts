import type {
  Business,
  CalendarItem,
  ContentItem,
  ProductService,
  Strategy,
} from "../types";

export const SYSTEM_EVA = `Sos Eva, la agente de marketing de LOCA ("Humanless marketing").
Generás estrategia y contenido de marketing de altísima calidad para micro y pequeñas empresas.
Reglas:
- Respondé SIEMPRE en español rioplatense, usando "vos" (no "tú").
- Tono cercano, claro, simple y profesional. Nada de relleno corporativo.
- Devolvé SIEMPRE un único objeto JSON válido, sin markdown ni texto extra.
- Sé concreto y accionable. Adaptá todo al negocio real que te pasan.`;

function businessContext(b: Business): string {
  const ps = b.productsServices
    .map(
      (p) =>
        `- (${p.type}) ${p.name}${p.isTopSeller ? " [TOP SELLER]" : ""}: ${
          p.shortDescription || ""
        } ${p.priceMin ? `desde ${p.priceMin} ${p.currency}` : ""}`
    )
    .join("\n");
  return `DATOS DEL NEGOCIO:
Nombre: ${b.name}
Industria: ${b.industry} / ${b.subcategory}
Tipo: ${b.businessType} | Modelo: ${b.businessModel}
Ubicación: ${b.city}, ${b.state}, ${b.country}
Descripción corta: ${b.shortDescription}
Descripción: ${b.fullDescription}
Valores: ${b.values.join(", ")}
Ventajas competitivas: ${b.competitiveAdvantages.join(", ")}
Canales: ${b.marketingChannels.join(", ")}
Estacionalidad: ${b.seasonality}
Fechas especiales: ${b.specialDates.join(", ")}
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

export function strategyPrompt(b: Business, feedback?: string): string {
  return `${businessContext(b)}
${feedback ? `\nAJUSTE PEDIDO POR EL USUARIO (aplicalo): "${feedback}"\n` : ""}
Generá una estrategia de marketing/contenido completa. Devolvé EXACTAMENTE este JSON:
{
  "businessSummary": string,
  "brandPositioning": string,
  "audienceSummary": string,
  "mainAngle": string,
  "contentPillars": [{ "name": string, "description": string }],  // 3 a 5
  "toneOfVoice": string,
  "recommendedChannels": string[],  // de: Instagram, Facebook, TikTok, LinkedIn
  "monthlyGoal": string,
  "recommendedCta": string,
  "offerIdeas": string[],
  "dos": string[],
  "donts": string[],
  "keyMessages": string[],
  "contentMix": [{ "type": string, "percentage": number }],
  "nextActions": string[]
}`;
}

export function calendarPrompt(
  b: Business,
  s: Strategy,
  count: number,
  feedback?: string
): string {
  return `${businessContext(b)}

ESTRATEGIA:
Ángulo: ${s.mainAngle}
Pilares: ${s.contentPillars.map((p) => p.name).join(", ")}
Tono: ${s.toneOfVoice}
Canales: ${s.recommendedChannels.join(", ")}
CTA: ${s.recommendedCta}
${feedback ? `\nAJUSTE PEDIDO POR EL USUARIO (aplicalo): "${feedback}"\n` : ""}
Generá un calendario de ${count} publicaciones para el próximo mes, variando formatos y pilares.
Devolvé EXACTAMENTE este JSON:
{
  "items": [
    {
      "dayOffset": number,        // días desde hoy (1..30)
      "suggestedTime": string,    // ej "18:30"
      "channel": string,          // Instagram | Facebook | TikTok | LinkedIn
      "format": string,           // post_estatico | carrusel | reel | story | ad | email
      "contentPillar": string,
      "objective": string,        // Alcance | Engagement | Conversión
      "topic": string
    }
  ]
}`;
}

export function contentPrompt(b: Business, s: Strategy, item: CalendarItem): string {
  return `${businessContext(b)}${brandContext(b)}

ESTRATEGIA: tono = ${s.toneOfVoice}; CTA recomendado = ${s.recommendedCta}.
PIEZA A GENERAR:
Canal: ${item.channel} | Formato: ${item.format} | Pilar: ${item.contentPillar} | Objetivo: ${item.objective}
Tema: ${item.topic}

Generá la pieza completa. Devolvé EXACTAMENTE este JSON:
{
  "title": string,
  "caption": string,
  "hook": string,
  "body": string,
  "cta": string,
  "hashtags": string[],
  "visualConcept": string,
  "imagePrompt": string,   // prompt en inglés o español para generar la imagen, SIN texto incrustado
  "suggestedLayout": string,
  "designTextOverlay": string,  // texto corto para poner sobre la imagen
  "assetNotes": string,
  ${
    item.format === "reel"
      ? `"videoScript": { "concept": string, "durationSeconds": number, "scenes": [{ "scene": string, "onScreenText": string, "voiceover": string }], "music": string, "cta": string },`
      : `"photoBrief": { "idea": string, "shotList": string[], "props": string[], "composition": string },`
  }
}`;
}

export function feedbackPrompt(
  b: Business,
  item: ContentItem,
  feedbackText: string
): string {
  return `${businessContext(b)}${brandContext(b)}

PIEZA ACTUAL (JSON):
${JSON.stringify(
    {
      title: item.title,
      caption: item.caption,
      hook: item.hook,
      body: item.body,
      cta: item.cta,
      hashtags: item.hashtags,
      visualConcept: item.visualConcept,
      imagePrompt: item.imagePrompt,
    },
    null,
    2
  )}

INSTRUCCIÓN DE AJUSTE DEL USUARIO: "${feedbackText}"

Regenerá la pieza aplicando el ajuste, manteniendo coherencia con la marca. Devolvé EXACTAMENTE este JSON:
{
  "title": string,
  "caption": string,
  "hook": string,
  "body": string,
  "cta": string,
  "hashtags": string[],
  "visualConcept": string,
  "imagePrompt": string,
  "suggestedLayout": string,
  "designTextOverlay": string,
  "assetNotes": string
}`;
}

export function metaAdsPrompt(b: Business): string {
  return `${businessContext(b)}

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
  return `Analizá la web de un negocio y devolvé info ESTRUCTURADA para prellenar un formulario de marketing.
URL: ${input.url}
TÍTULO: ${input.title}
DESCRIPCIÓN: ${input.description}
TITULARES: ${input.headings.slice(0, 20).join(" | ")}
PÁRRAFOS: ${input.paragraphs.slice(0, 12).join(" ")}
BOTONES: ${input.buttons.slice(0, 15).join(" | ")}
REDES DETECTADAS: ${input.socials.join(", ") || "(ninguna)"}
TEXTO (parcial):
"""
${input.text.slice(0, 5000)}
"""

Reglas:
- En español rioplatense (vos).
- NO inventes datos como seguros. Si inferís algo, está bien, pero debe ser razonable según la web.
- Dejá "" o [] lo que no puedas inferir.

Devolvé EXACTAMENTE este JSON:
{
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
  "whatEvaUnderstood": string        // 1-2 frases: qué entendió Eva del negocio
}`;
}

// Contexto de marca para generación de contenido/imágenes (Brand Kit + BI).
export function brandContext(b: Business): string {
  const bk = b.brandKit;
  const bi = b.businessIntelligence;
  if (!bk && !bi) return "";
  const parts: string[] = ["\nIDENTIDAD DE MARCA:"];
  if (bk?.colors?.palette?.length) {
    parts.push(`Colores: ${bk.colors.palette.map((c) => `${c.name} ${c.hex}`).join(", ")}.`);
  }
  if (bk?.visualStyle?.mood?.length) parts.push(`Estilo visual: ${bk.visualStyle.mood.join(", ")}.`);
  if (bk?.visualStyle?.imageStyle) parts.push(`Estilo de imágenes: ${bk.visualStyle.imageStyle}.`);
  if (bk?.voiceTone?.toneTags?.length) parts.push(`Tono de voz: ${bk.voiceTone.toneTags.join(", ")}.`);
  if (bk?.brandKeywords?.length) parts.push(`Palabras clave de marca: ${bk.brandKeywords.join(", ")}.`);
  if (bk?.avoidList?.length) parts.push(`EVITAR (no usar): ${bk.avoidList.join("; ")}.`);
  if (bi?.primaryConversion?.type) parts.push(`Conversión principal: ${bi.primaryConversion.type}.`);
  if (bi?.recommendedGoal?.goal) parts.push(`Objetivo recomendado: ${bi.recommendedGoal.goal}.`);
  return parts.join("\n");
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
  return `${businessContext(b)}

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
