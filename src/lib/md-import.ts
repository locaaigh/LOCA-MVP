// ─────────────────────────────────────────────────────────────
// Import de negocio por IA externa (.md) — FUENTE DE VERDAD ÚNICA.
//
// `EXTERNAL_AI_IMPORT_SCHEMA` describe cada campo importable (key del .md,
// aliases, sección, si es crítico, ejemplo, cómo mapea al store). Desde ese
// schema se generan:
//   1. el prompt externo que ve el usuario  (buildExternalAiPrompt)
//   2. la plantilla .md vacía                (emptyMdTemplate)
//   3. el parser .md → WebsiteAnalysis       (parseExternalMarkdown)
// Así no hay listas de campos duplicadas que se desalineen con el formulario.
//
// Reglas de estado por valor:
//   vacío / FALTA_COMPLETAR → missing
//   INCOMPLETO              → review (o missing si el campo es crítico)
//   REVISAR                 → review
//   INFERIDO               → suggested
//   valor real             → found
// NUNCA inventa datos (precios solo si vienen explícitos en el texto).
// ─────────────────────────────────────────────────────────────
import type {
  Confidence,
  FieldStatus,
  ProductServiceType,
  WebsiteAnalysis,
  WebsiteFoundFields,
} from "./types";

// ── Normalización de claves ──────────────────────────────────
function normKey(k: string): string {
  return k
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // saca acentos
    .replace(/[^a-z0-9]+/g, "_") // espacios/guiones → _
    .replace(/^_+|_+$/g, "");
}

function splitList(v: string): string[] {
  return v
    .split(/[,;|\n]/)
    // Saca solo viñetas reales ("- ", "* ", "• ", "1. "), no rangos tipo 25-34.
    .map((s) => s.replace(/^\s*(?:[-*•]\s+|\d+[.)]\s+)/, "").trim())
    .filter(Boolean);
}

// Plataformas/canales canónicos (alineado con constants.MARKETING_CHANNELS)
function normalizeChannels(v: string): string[] {
  const raw = splitList(v);
  const out: string[] = [];
  const push = (label: string) => {
    if (!out.includes(label)) out.push(label);
  };
  for (const token of raw) {
    const t = normKey(token);
    if (/insta/.test(t)) push("Instagram");
    else if (/facebook|\bfb\b|face/.test(t)) push("Facebook");
    else if (/tiktok|tik_tok/.test(t)) push("TikTok");
    else if (/linkedin/.test(t)) push("LinkedIn");
    else if (/youtube|yt/.test(t)) push("YouTube");
    else if (/(^|_)x($|_)|twitter/.test(t)) push("X");
    else if (/pinterest/.test(t)) push("Pinterest");
    else if (/whatsapp|wpp|wsp/.test(t)) push("WhatsApp");
    else if (/google/.test(t)) push("Google Business Profile");
    else if (/email|mail|news/.test(t)) push("Email");
    else if (/blog|web|sitio/.test(t)) push("Blog");
    else if (token.trim()) push(token.trim());
  }
  return out;
}

// "visibilidad" | "ventas" | "confianza" (objetivo principal de contenido)
function normalizeGoal(v: string): string | undefined {
  const t = normKey(v);
  if (/(vent|vender|compra|conversion|facturar)/.test(t)) return "ventas";
  if (/(visib|reconoc|alcance|conocer|awareness|dar_a_conocer|marca)/.test(t)) return "visibilidad";
  if (/(confianz|comunidad|fideliz|autoridad|credibil)/.test(t)) return "confianza";
  return undefined;
}

function normalizeModel(v: string): string {
  const t = v.toUpperCase();
  if (t.includes("B2B") && t.includes("B2C")) return "Ambos";
  if (t.includes("B2B")) return "B2B";
  if (t.includes("B2C")) return "B2C";
  if (/ambos|los dos|empresas y personas/i.test(v)) return "Ambos";
  return v.trim();
}

// Extrae precio SOLO si viene explícito (no inventa). Devuelve {name, price?}.
function parseProductEntry(entry: string): { name: string; price?: number } {
  const m = entry.match(/(.+?)[\s\-–—:]*\$?\s*([\d.]+(?:[.,]\d{1,2})?)\s*(?:usd|ars|eur|pesos|dolares|d[oó]lares)?\.?$/i);
  if (m && /\d/.test(m[2])) {
    const name = m[1].replace(/[\s\-–—:(]+$/, "").trim();
    const num = Number(m[2].replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
    if (name && Number.isFinite(num) && num > 0) return { name, price: num };
  }
  return { name: entry.trim() };
}

// ── Marcadores de estado ─────────────────────────────────────
type Marker = "missing" | "incompleto" | "revisar" | "inferido" | "found";
const PLACEHOLDER = /^\s*\[.*\]\s*$/;

function interpret(value: string): { marker: Marker; clean: string } {
  const v = value.trim();
  if (!v || PLACEHOLDER.test(v) || /FALTA_COMPLETAR/i.test(v)) return { marker: "missing", clean: "" };
  if (/INCOMPLETO/i.test(v)) return { marker: "incompleto", clean: stripMarker(v) };
  if (/REVISAR/i.test(v)) return { marker: "revisar", clean: stripMarker(v) };
  if (/INFERIDO/i.test(v)) return { marker: "inferido", clean: stripMarker(v) };
  return { marker: "found", clean: v };
}

function stripMarker(v: string): string {
  return v
    .replace(/INCOMPLETO|REVISAR|INFERIDO/gi, "")
    .replace(/^[\s:.\-–—()]+|[\s:.\-–—()]+$/g, "")
    .trim();
}

// ─────────────────────────────────────────────────────────────
// SCHEMA: la única lista de campos importables.
// ─────────────────────────────────────────────────────────────
export type ImportSectionId = "basicos" | "oferta" | "audiencia" | "propuesta" | "canales" | "objetivos" | "marca" | "agenda";

export interface ImportField {
  /** key canónica que se escribe en el .md */
  mdKey: string;
  label: string;
  section: ImportSectionId;
  /** bucket de estado (alineado a las keys de fieldStatuses del form) */
  statusKey: string;
  critical: boolean;
  multiple: boolean;
  example: string;
  hint: string;
  aliases?: string[];
  /** mapea el valor limpio dentro de WebsiteFoundFields */
  apply: (f: WebsiteFoundFields, value: string) => void;
}

export const IMPORT_SECTIONS: { id: ImportSectionId; title: string }[] = [
  { id: "basicos", title: "Datos básicos del negocio" },
  { id: "oferta", title: "Productos y servicios" },
  { id: "audiencia", title: "Audiencia" },
  { id: "propuesta", title: "Propuesta de valor" },
  { id: "canales", title: "Canales / plataformas" },
  { id: "objetivos", title: "Objetivos" },
  { id: "marca", title: "Tono y marca" },
  { id: "agenda", title: "Agenda comercial (opcional)" },
];

export const EXTERNAL_AI_IMPORT_SCHEMA: ImportField[] = [
  // ── Básicos ──
  {
    mdKey: "nombre_del_negocio",
    label: "Nombre del negocio",
    section: "basicos",
    statusKey: "name",
    critical: true,
    multiple: false,
    example: "Café Bruma",
    hint: "Nombre comercial tal como lo conocen los clientes.",
    aliases: ["nombre_comercial", "nombre", "razon_social", "marca"],
    apply: (f, v) => (f.name = v),
  },
  {
    mdKey: "industria",
    label: "Industria",
    section: "basicos",
    statusKey: "industry",
    critical: true,
    multiple: false,
    example: "Food & Beverage",
    hint: "Rubro general del negocio.",
    aliases: ["rubro", "sector"],
    apply: (f, v) => (f.industry = v),
  },
  {
    mdKey: "subcategoria",
    label: "Subcategoría / rubro específico",
    section: "basicos",
    statusKey: "subcategory",
    critical: true,
    multiple: false,
    example: "Cafetería de especialidad",
    hint: "Tipo específico dentro de la industria.",
    aliases: ["rubro_especifico", "categoria"],
    apply: (f, v) => (f.subcategory = v),
  },
  {
    mdKey: "tipo_de_negocio",
    label: "Tipo de negocio",
    section: "basicos",
    statusKey: "businessType",
    critical: true,
    multiple: false,
    example: "Local físico",
    hint: "Local físico / Online / Híbrido / Servicios a domicilio / Marca personal.",
    aliases: ["tipo"],
    apply: (f, v) => (f.businessType = v),
  },
  {
    mdKey: "modelo_de_negocio",
    label: "Modelo (B2B / B2C)",
    section: "basicos",
    statusKey: "businessModel",
    critical: false,
    multiple: false,
    example: "B2C",
    hint: "B2B, B2C o Ambos.",
    aliases: ["modelo", "b2b_b2c"],
    apply: (f, v) => (f.businessModel = normalizeModel(v)),
  },
  {
    mdKey: "pais",
    label: "País o mercado principal",
    section: "basicos",
    statusKey: "country",
    critical: true,
    multiple: false,
    example: "Argentina",
    hint: "País principal donde opera.",
    aliases: ["mercado", "pais_principal"],
    apply: (f, v) => (f.country = v),
  },
  {
    mdKey: "provincia_estado",
    label: "Provincia / Estado",
    section: "basicos",
    statusKey: "state",
    critical: false,
    multiple: false,
    example: "Buenos Aires",
    hint: "Si aplica.",
    aliases: ["provincia", "estado", "region"],
    apply: (f, v) => (f.state = v),
  },
  {
    mdKey: "ciudad",
    label: "Ciudad",
    section: "basicos",
    statusKey: "city",
    critical: false,
    multiple: false,
    example: "CABA",
    hint: "Si aplica.",
    aliases: ["localidad"],
    apply: (f, v) => (f.city = v),
  },
  {
    mdKey: "sitio_web",
    label: "Sitio web",
    section: "basicos",
    statusKey: "websiteUrl",
    critical: false,
    multiple: false,
    example: "https://cafebruma.com",
    hint: "URL completa si tiene.",
    aliases: ["web", "url", "pagina_web"],
    apply: (f, v) => (f.websiteUrl = v),
  },
  {
    mdKey: "descripcion_corta",
    label: "Descripción corta",
    section: "basicos",
    statusKey: "shortDescription",
    critical: true,
    multiple: false,
    example: "Cafetería de especialidad con granos de origen y pastelería artesanal.",
    hint: "1-2 frases: qué hace el negocio.",
    aliases: ["descripcion", "resumen"],
    apply: (f, v) => (f.shortDescription = v),
  },
  {
    mdKey: "descripcion_larga",
    label: "Descripción completa",
    section: "basicos",
    statusKey: "fullDescription",
    critical: false,
    multiple: false,
    example: "Somos una cafetería de especialidad fundada en 2020...",
    hint: "Más detalle: qué, cómo y para quién.",
    aliases: ["descripcion_completa", "acerca_de"],
    apply: (f, v) => (f.fullDescription = v),
  },

  // ── Oferta (productos / servicios) ──
  {
    mdKey: "productos_principales",
    label: "Productos principales",
    section: "oferta",
    statusKey: "productsServices",
    critical: true,
    multiple: true,
    example: "Café de filtro, Blend de la casa, Medialunas",
    hint: "Lista separada por comas. Si hay precio explícito incluilo (ej: 'Blend - $4500'). NO inventes precios.",
    aliases: ["productos", "catalogo_productos"],
    apply: (f, v) => addOfferings(f, v, "producto"),
  },
  {
    mdKey: "servicios_principales",
    label: "Servicios principales",
    section: "oferta",
    statusKey: "productsServices",
    critical: false,
    multiple: true,
    example: "Catering de eventos, Barismo para empresas",
    hint: "Lista separada por comas. NO inventes precios.",
    aliases: ["servicios", "catalogo_servicios"],
    apply: (f, v) => addOfferings(f, v, "servicio"),
  },
  {
    mdKey: "producto_o_servicio_mas_importante",
    label: "El más importante",
    section: "oferta",
    statusKey: "productsServices",
    critical: false,
    multiple: false,
    example: "Blend de la casa",
    hint: "Tu producto/servicio estrella.",
    aliases: ["mas_vendido", "estrella", "top_seller"],
    apply: (f, v) => markTopSeller(f, v),
  },

  // ── Audiencia ──
  {
    mdKey: "publico_objetivo",
    label: "Público objetivo",
    section: "audiencia",
    statusKey: "audience",
    critical: true,
    multiple: true,
    example: "Profesionales jóvenes, amantes del café",
    hint: "Segmentos principales de tu audiencia.",
    aliases: ["audiencia", "publico", "cliente_ideal", "segmentos"],
    apply: (f, v) => (f.audience = { ...(f.audience || {}), segments: splitList(v) }),
  },
  {
    mdKey: "edad_aproximada",
    label: "Edad aproximada",
    section: "audiencia",
    statusKey: "audience",
    critical: false,
    multiple: true,
    example: "25-34, 35-44",
    hint: "Rangos de edad.",
    aliases: ["edad", "rango_etario", "edades"],
    apply: (f, v) => (f.audience = { ...(f.audience || {}), ageRanges: splitList(v) }),
  },
  {
    mdKey: "dolores_o_problemas",
    label: "Dolores / problemas que resolvés",
    section: "audiencia",
    statusKey: "audience",
    critical: false,
    multiple: true,
    example: "Falta de tiempo, querer un café de calidad cerca",
    hint: "Necesidades que resuelve tu negocio.",
    aliases: ["dolores", "problemas", "pain_points", "necesidades"],
    apply: (f, v) => (f.audience = { ...(f.audience || {}), painPoints: splitList(v) }),
  },

  // ── Propuesta de valor ──
  {
    mdKey: "propuesta_de_valor",
    label: "Propuesta de valor / diferenciador",
    section: "propuesta",
    statusKey: "competitiveAdvantages",
    critical: true,
    multiple: true,
    example: "Granos de origen, tueste propio, atención cercana",
    hint: "Por qué te eligen. Beneficios y diferenciales.",
    aliases: ["diferenciales", "ventajas_competitivas", "diferenciador", "beneficios", "principales_beneficios"],
    apply: (f, v) => (f.competitiveAdvantages = mergeList(f.competitiveAdvantages, v)),
  },
  {
    mdKey: "valores_de_marca",
    label: "Valores de marca",
    section: "propuesta",
    statusKey: "values",
    critical: false,
    multiple: true,
    example: "Calidad, Sustentabilidad, Comunidad",
    hint: "Hasta 5 valores.",
    aliases: ["valores"],
    apply: (f, v) => (f.values = splitList(v).slice(0, 5)),
  },

  // ── Canales / plataformas ──
  {
    mdKey: "canales_y_plataformas",
    label: "Canales / plataformas",
    section: "canales",
    statusKey: "marketingChannels",
    critical: true,
    multiple: true,
    example: "Instagram, Facebook, TikTok",
    hint: "Redes/plataformas donde querés publicar (Instagram, Facebook, TikTok, LinkedIn, etc.).",
    aliases: ["canales", "plataformas", "redes_sociales", "redes", "canales_de_venta"],
    apply: (f, v) => (f.marketingChannels = mergeList(f.marketingChannels, normalizeChannels(v).join(", "))),
  },
  {
    mdKey: "marketing_actual",
    label: "Qué venís haciendo de marketing",
    section: "canales",
    statusKey: "marketingActivities",
    critical: false,
    multiple: true,
    example: "Redes orgánicas, WhatsApp",
    hint: "Acciones de marketing actuales.",
    aliases: ["marketing", "acciones_de_marketing", "que_hacen_de_marketing"],
    apply: (f, v) => (f.marketingActivities = splitList(v)),
  },

  // ── Objetivos ──
  {
    mdKey: "objetivo_principal",
    label: "Objetivo principal",
    section: "objetivos",
    statusKey: "goals",
    critical: true,
    multiple: false,
    example: "Ventas",
    hint: "Visibilidad, Ventas o Confianza.",
    aliases: ["objetivo", "prioridad_actual", "meta_principal"],
    apply: (f, v) => {
      const g = normalizeGoal(v);
      f.goals = { ...(f.goals || {}), ...(g ? { primaryContentGoal: g as any } : {}) };
    },
  },
  {
    mdKey: "objetivos_de_marketing",
    label: "Objetivos de marketing",
    section: "objetivos",
    statusKey: "goals",
    critical: false,
    multiple: false,
    example: "Aumentar reservas un 20% en 3 meses",
    hint: "Qué querés lograr con el marketing.",
    aliases: ["meta_marketing", "objetivos_marketing"],
    apply: (f, v) => (f.goals = { ...(f.goals || {}), marketingObjectives: v }),
  },

  // ── Tono y marca ──
  {
    mdKey: "tono_de_marca",
    label: "Tono de marca",
    section: "marca",
    statusKey: "brandKit",
    critical: true,
    multiple: true,
    example: "Cercano, Profesional, Cálido",
    hint: "Cómo suena tu marca.",
    aliases: ["tono", "voz_de_marca", "personalidad"],
    apply: (f, v) =>
      (f.brandKit = {
        ...(f.brandKit || ({} as any)),
        voiceTone: { ...((f.brandKit as any)?.voiceTone || {}), toneTags: splitList(v) },
      } as any),
  },
  {
    mdKey: "palabras_o_temas_a_evitar",
    label: "Cosas a evitar",
    section: "marca",
    statusKey: "brandKit",
    critical: false,
    multiple: true,
    example: "Lenguaje informal, descuentos agresivos",
    hint: "Palabras, temas o claims que NO querés usar.",
    aliases: ["evitar", "palabras_que_no_usa", "temas_que_debe_evitar", "restricciones"],
    apply: (f, v) =>
      (f.brandKit = {
        ...(f.brandKit || ({} as any)),
        avoidList: [...(((f.brandKit as any)?.avoidList) || []), ...splitList(v)],
      } as any),
  },

  // ── Agenda comercial (opcional) ──
  {
    mdKey: "temporadas_fuertes",
    label: "Temporadas fuertes",
    section: "agenda",
    statusKey: "seasonalityTags",
    critical: false,
    multiple: true,
    example: "Invierno, Navidad",
    hint: "Épocas de mayor venta.",
    aliases: ["estacionalidad", "temporadas"],
    apply: (f, v) => (f.seasonalityTags = splitList(v)),
  },
  {
    mdKey: "fechas_importantes",
    label: "Fechas importantes",
    section: "agenda",
    statusKey: "specialDates",
    critical: false,
    multiple: true,
    example: "Aniversario de la marca, Día del Padre",
    hint: "Fechas clave para campañas.",
    aliases: ["fechas_especiales", "fechas_clave"],
    apply: (f, v) => (f.specialDates = splitList(v)),
  },
];

function mergeList(prev: string[] | undefined, value: string): string[] {
  const next = splitList(value);
  const set = new Set([...(prev || []), ...next]);
  return Array.from(set);
}

function addOfferings(f: WebsiteFoundFields, value: string, type: ProductServiceType) {
  f.productsServices ||= [];
  for (const entry of splitList(value)) {
    const { name, price } = parseProductEntry(entry);
    if (!name) continue;
    f.productsServices.push({
      name,
      type,
      // No inventamos precio: solo si vino explícito en el texto.
      ...(price != null ? { price } : {}),
      source: "md",
      shouldReview: true,
    });
  }
}

function markTopSeller(f: WebsiteFoundFields, value: string) {
  if (!value || !f.productsServices?.length) return;
  const q = value.toLowerCase().slice(0, 6);
  const match = f.productsServices.find((p) => p.name.toLowerCase().includes(q));
  (match || f.productsServices[0]).isTopSeller = true;
}

// Índice normalizado: cada mdKey + aliases → ImportField
const FIELD_INDEX: Record<string, ImportField> = (() => {
  const idx: Record<string, ImportField> = {};
  for (const f of EXTERNAL_AI_IMPORT_SCHEMA) {
    idx[normKey(f.mdKey)] = f;
    for (const a of f.aliases || []) idx[normKey(a)] = f;
  }
  return idx;
})();

// ─────────────────────────────────────────────────────────────
// 1) PROMPT EXTERNO (generado desde el schema)
// ─────────────────────────────────────────────────────────────
export function buildExternalAiPrompt(businessName?: string): string {
  const guide = IMPORT_SECTIONS.map((sec) => {
    const fields = EXTERNAL_AI_IMPORT_SCHEMA.filter((f) => f.section === sec.id);
    const lines = fields
      .map((f) => `  - ${f.mdKey}: ${f.hint} (ej: ${f.example})${f.critical ? "  [IMPORTANTE]" : ""}`)
      .join("\n");
    return `• ${sec.title}\n${lines}`;
  }).join("\n\n");

  return `Necesito que prepares un archivo Markdown (.md) con la información de mi negocio${
    businessName ? ` ("${businessName}")` : ""
  } para cargarlo en LOCA, una herramienta de marketing con IA.

REGLAS OBLIGATORIAS:
1. Usá SOLO información real que conozcas de mi negocio o que yo te haya dado.
2. NO inventes datos. NO completes con suposiciones como si fueran confirmadas.
3. Si un dato no lo sabés, escribí exactamente: FALTA_COMPLETAR
4. Si está parcial, escribí: INCOMPLETO: y aclará qué falta.
5. Si es una inferencia tuya, marcalo: INFERIDO: (valor)
6. Si tenés dudas, marcalo: REVISAR: (valor)
7. NO inventes precios. Incluí un precio solo si lo sabés con certeza.

FORMATO DE ENTREGA (MUY IMPORTANTE):
- Entregame un archivo Markdown .md llamado loca-resumen-negocio.md.
- NO uses PDF. NO uses DOC/DOCX. NO uses presentaciones. NO uses tablas visuales ni documentos enriquecidos.
- Si no podés crear un archivo descargable .md, devolveme UN SOLO bloque de código Markdown. El usuario debe poder usar el botón de copiar del bloque de código y pegarlo directamente en LOCA.
- No escribas explicaciones antes ni después del Markdown.
- No cambies los nombres de las claves. LOCA las lee automáticamente.

GUÍA DE CAMPOS (qué poner en cada clave):
${guide}

ESTRUCTURA EXACTA A DEVOLVER (copiá estas claves y completá los valores; dejá FALTA_COMPLETAR donde no sepas):

${buildTemplate()}

FORMATO FINAL OBLIGATORIO:
Devolveme únicamente el contenido Markdown final, con esas claves exactas.
El usuario debe poder guardarlo como loca-resumen-negocio.md o copiar el bloque de código.
No uses PDF. No uses DOC/DOCX. No agregues texto fuera del Markdown.`;
}

// Compatibilidad con llamadas existentes.
export function externalAiPrompt(businessName?: string): string {
  return buildExternalAiPrompt(businessName);
}

// ─────────────────────────────────────────────────────────────
// 2) PLANTILLA .md vacía (generada desde el schema)
// ─────────────────────────────────────────────────────────────
function buildTemplate(): string {
  let out = "# LOCA - Resumen del negocio\n";
  for (const sec of IMPORT_SECTIONS) {
    const fields = EXTERNAL_AI_IMPORT_SCHEMA.filter((f) => f.section === sec.id);
    if (!fields.length) continue;
    out += `\n## ${sec.title}\n`;
    for (const f of fields) out += `- ${f.mdKey}: FALTA_COMPLETAR\n`;
  }
  return out.trimEnd();
}

export function emptyMdTemplate(): string {
  return buildTemplate();
}

// ─────────────────────────────────────────────────────────────
// 3) PARSER .md → WebsiteAnalysis (usa el mismo schema/aliases)
// ─────────────────────────────────────────────────────────────
const CONF: Record<FieldStatus["status"], Confidence> = {
  found: "high",
  suggested: "medium",
  review: "low",
  missing: "low",
  user: "high",
};

export function parseExternalMarkdown(md: string): WebsiteAnalysis {
  const lines = md.split(/\r?\n/);
  const found: WebsiteFoundFields = {};
  const fieldStatuses: Record<string, FieldStatus> = {};
  const missingSet = new Set<string>();

  const setStatus = (key: string, status: FieldStatus["status"]) => {
    const prev = fieldStatuses[key]?.status;
    // No degradar un estado bueno con uno peor del mismo bucket.
    const rank: Record<string, number> = { missing: 0, review: 1, suggested: 2, found: 3, user: 3 };
    if (prev && rank[prev] >= rank[status]) return;
    fieldStatuses[key] = { status, confidence: CONF[status], source: "external_ai" };
    if (status === "missing") missingSet.add(key);
    else missingSet.delete(key);
  };

  for (const raw of lines) {
    const line = raw.trim();
    const m = line.match(/^[-*]\s*([^:]+?)\s*:\s*(.*)$/);
    if (!m) continue;
    const field = FIELD_INDEX[normKey(m[1])];
    if (!field) continue;

    const { marker, clean } = interpret(m[2]);

    // Estado del campo según marcador (INCOMPLETO en crítico = missing).
    let status: FieldStatus["status"];
    if (marker === "missing") status = "missing";
    else if (marker === "incompleto") status = field.critical ? "missing" : "review";
    else if (marker === "revisar") status = "review";
    else if (marker === "inferido") status = "suggested";
    else status = "found";

    if (status === "missing") {
      setStatus(field.statusKey, "missing");
      continue;
    }
    if (clean) field.apply(found, clean);
    setStatus(field.statusKey, status);
  }

  // productsServices: confianza/estado de cada item según el status del bucket.
  if (found.productsServices?.length) {
    const st = fieldStatuses["productsServices"]?.status || "found";
    for (const p of found.productsServices) {
      p.confidence = st === "found" ? "high" : st === "suggested" ? "medium" : "low";
      p.shouldReview = st !== "found";
    }
  }

  const isComplete = isAnalysisComplete({ foundFields: found } as WebsiteAnalysis);
  const completed = Object.values(fieldStatuses).filter((f) => f.status === "found").length;
  const suggested = Object.values(fieldStatuses).filter((f) => f.status === "suggested").length;
  const review = Object.values(fieldStatuses).filter((f) => f.status === "review").length;
  const missing = Array.from(missingSet);

  return {
    confidence: isComplete ? 0.85 : 0.5,
    summary: {
      whatEvaUnderstood: found.shortDescription || found.fullDescription || found.name || "",
      completedFieldsCount: completed,
      missingFieldsCount: missing.length,
      reviewFieldsCount: review + suggested,
    },
    foundFields: found,
    fieldStatuses,
    missingFields: missing,
    lowConfidenceFields: Object.entries(fieldStatuses).filter(([, v]) => v.confidence === "low").map(([k]) => k),
    notes: [],
    mode: "ai",
  };
}

export function isAnalysisComplete(a: WebsiteAnalysis): boolean {
  const f = a.foundFields || {};
  const has = (v: any) => v != null && v !== "" && (!Array.isArray(v) || v.length > 0);
  return (
    has(f.name) &&
    has(f.industry) &&
    has(f.shortDescription) &&
    has(f.competitiveAdvantages) &&
    has(f.productsServices) &&
    has(f.marketingChannels) &&
    has(f.goals?.primaryContentGoal)
  );
}

// ─────────────────────────────────────────────────────────────
// 4) Ejemplo de .md para test manual del parser.
// ─────────────────────────────────────────────────────────────
export function sampleImportMarkdown(): string {
  return `# LOCA - Resumen del negocio

## Datos básicos del negocio
- nombre_del_negocio: Café Bruma
- industria: Food & Beverage
- subcategoria: Cafetería de especialidad
- tipo_de_negocio: Local físico
- modelo_de_negocio: B2C
- pais: Argentina
- ciudad: INFERIDO: CABA
- descripcion_corta: Cafetería de especialidad con tueste propio y pastelería artesanal.
- descripcion_larga: FALTA_COMPLETAR

## Productos y servicios
- productos_principales: Blend de la casa - $4500, Café de filtro, Medialunas
- servicios_principales: Catering para eventos
- producto_o_servicio_mas_importante: Blend de la casa

## Audiencia
- publico_objetivo: Profesionales jóvenes, amantes del café
- edad_aproximada: 25-34, 35-44
- dolores_o_problemas: REVISAR: querer buen café cerca del trabajo

## Propuesta de valor
- propuesta_de_valor: Granos de origen, tueste propio, atención cercana
- valores_de_marca: Calidad, Comunidad

## Canales / plataformas
- canales_y_plataformas: Instagram, Facebook, TikTok
- marketing_actual: Redes orgánicas

## Objetivos
- objetivo_principal: Ventas
- objetivos_de_marketing: FALTA_COMPLETAR

## Tono y marca
- tono_de_marca: Cercano, Cálido, Profesional
- palabras_o_temas_a_evitar: INFERIDO: lenguaje demasiado informal

## Agenda comercial (opcional)
- temporadas_fuertes: Invierno
- fechas_importantes: FALTA_COMPLETAR`;
}
