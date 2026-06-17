// ─────────────────────────────────────────────────────────────
// Importar un resumen de negocio en Markdown generado por otra IA.
// Prompt estricto + plantilla vacía + parser tolerante que respeta
// los marcadores FALTA_COMPLETAR / INCOMPLETO / REVISAR / INFERIDO.
// NO asume que todo es verdad: usa lo que la IA marcó.
// ─────────────────────────────────────────────────────────────
import type { Confidence, FieldStatus, WebsiteAnalysis, WebsiteFoundFields } from "./types";

// Estructura del archivo .md que esperamos (con valores vacíos).
const TEMPLATE_BODY = `# LOCA - Resumen estructurado del negocio

## 1. Metadatos del archivo
- fuente: IA externa
- nombre_ia: [ChatGPT / Claude / Gemini / otra]
- fecha_generacion: [fecha de hoy]
- nivel_confianza_general: [alto / medio / bajo]
- aclaraciones_generales:

## 2. Estado general de completitud
- formulario_completo: [si / no]
- campos_faltantes_importantes:
- campos_a_revisar:
- recomendacion: [puede pasar directo a resumen / necesita completar campos pendientes]

## 3. Datos básicos del negocio
- nombre_comercial:
- razon_social:
- industria:
- subcategoria:
- tipo_de_negocio: [producto / servicio / producto y servicio / marketplace / ecommerce / local físico / SaaS / consultoría / otro]
- modelo_de_negocio: [B2B / B2C / B2B y B2C]
- pais:
- provincia_estado:
- ciudad:
- zonas_de_operacion:
- sitio_web:
- redes_sociales:
  - instagram:
  - facebook:
  - linkedin:
  - tiktok:
  - youtube:
  - otra:
- descripcion_corta:
- descripcion_larga:

## 4. Oferta comercial
- productos_principales:
- servicios_principales:
- producto_o_servicio_mas_importante:
- ticket_promedio:
- rango_de_precios:
- frecuencia_de_compra:
- proceso_de_compra:
- canales_de_venta:
- promociones_actuales:
- estacionalidad:
- fechas_importantes_del_negocio:

## 5. Audiencia y clientes
- publico_objetivo_principal:
- publico_objetivo_secundario:
- edad_aproximada:
- genero_si_aplica:
- ubicacion_del_publico:
- nivel_socioeconomico_si_aplica:
- intereses:
- dolores_o_problemas:
- deseos_o_motivaciones:
- objeciones_frecuentes:
- motivos_por_los_que_compra:
- motivos_por_los_que_no_compra:
- cliente_ideal_descripcion:

## 6. Propuesta de valor y diferenciación
- propuesta_de_valor:
- principales_beneficios:
- diferenciales:
- ventajas_competitivas:
- valores_de_marca:
- razones_para_elegirnos:
- pruebas_de_confianza:
- casos_de_exito_o_resultados:
- competidores_directos:
- competidores_indirectos:
- posicionamiento_deseado:

## 7. Comunicación y tono
- tono_de_marca:
- personalidad_de_marca:
- palabras_que_si_usa:
- palabras_que_no_usa:
- temas_que_debe_evitar:
- mensajes_clave:
- slogan_o_frase_de_marca:
- estilo_de_copy_preferido:
- nivel_de_formalidad: [informal / cercano / profesional / técnico / premium / aspiracional / otro]
- emojis: [sí / no / moderado]
- humor: [sí / no / moderado]

## 8. Identidad visual / Brand Kit
- colores_principales:
- colores_secundarios:
- tipografias:
- estilo_visual:
- referencias_visuales:
- logo_disponible: [si / no / no se]
- uso_de_imagenes: [fotografía / ilustración / producto / personas / lifestyle / placas gráficas / mixto]
- restricciones_visuales:
- marcas_o_estilos_a_evitar:

## 9. Marketing actual
- canales_actuales:
- canales_prioritarios:
- frecuencia_de_publicacion_actual:
- tipos_de_contenido_actuales:
- que_contenidos_funcionan_mejor:
- que_contenidos_funcionan_peor:
- campañas_activas:
- inversion_publicitaria_actual:
- herramientas_que_usa:
- base_de_datos_email_whatsapp:
- acciones_comerciales_actuales:
- problemas_actuales_de_marketing:

## 10. Objetivos
- objetivo_principal:
- objetivos_secundarios:
- objetivo_de_marketing_30_dias:
- objetivo_de_marketing_90_dias:
- objetivo_de_negocio:
- prioridad_actual: [ventas / reconocimiento / comunidad / tráfico / leads / retención / lanzamiento / posicionamiento / otro]
- metricas_importantes:
- resultado_esperado:

## 11. Contenidos esperados
- plataformas_deseadas:
- formatos_deseados:
- cantidad_de_contenidos_mensuales:
- tipo_de_contenido_preferido:
- temas_a_comunicar:
- temas_a_evitar:
- productos_servicios_a_priorizar:
- fechas_o_eventos_a_incluir:
- ejemplos_de_contenidos_que_gustan:
- ejemplos_de_contenidos_que_no_gustan:

## 12. Restricciones, legales y sensibilidad
- restricciones_legales:
- claims_que_no_deben_usarse:
- temas_sensibles:
- informacion_confidencial:
- aprobaciones_necesarias:
- palabras_prohibidas:
- condiciones_importantes:

## 13. Información confirmada
- campo: valor

## 14. Información inferida
- campo: valor

## 15. Información para revisar
- campo: valor

## 16. Información faltante
- campo: motivo por el que falta

## 17. Preguntas pendientes para completar el formulario
- pregunta 1:
- pregunta 2:
- pregunta 3:

FIN DEL ARCHIVO`;

// Prompt estricto para pegar en ChatGPT / Claude / Gemini.
export function externalAiPrompt(businessName?: string): string {
  return `Necesito que prepares un archivo Markdown (.md) para cargar mi negocio${
    businessName ? ` ("${businessName}")` : ""
  } en LOCA, una herramienta de marketing con IA.

Tu objetivo es ayudarme a completar un formulario estratégico de marketing con la mayor precisión posible.

REGLAS OBLIGATORIAS:
1. Usá SOLO información real que conozcas de mi negocio o que yo te haya dado en conversaciones anteriores.
2. NO inventes datos.
3. NO completes campos con suposiciones como si fueran información confirmada.
4. Si un dato no lo sabés, escribí exactamente: FALTA_COMPLETAR.
5. Si un dato está parcial o incompleto, escribí exactamente: INCOMPLETO y explicá qué falta.
6. Si un dato es una inferencia tuya, marcalo como INFERIDO.
7. Si tenés dudas, marcalo como REVISAR.
8. Antes de entregar el archivo final, si falta información clave para marketing, haceme preguntas concretas.
9. Si no puedo o no quiero responder esas preguntas, dejá esos campos como FALTA_COMPLETAR.
10. No escribas recomendaciones generales fuera del formato. Necesito un archivo ordenado para subirlo a otra herramienta.

INSTRUCCIÓN IMPORTANTE:
Al final, devolveme un único bloque Markdown listo para guardar como archivo: loca-resumen-negocio.md

Dentro del Markdown, respetá EXACTAMENTE esta estructura:

${TEMPLATE_BODY}

Después de generar el Markdown, indicame: "Descargá o copiá este contenido como loca-resumen-negocio.md y subilo en LOCA."`;
}

// Plantilla .md vacía (misma estructura, campos como FALTA_COMPLETAR).
export function emptyMdTemplate(): string {
  return TEMPLATE_BODY.replace(/^(\s*-\s*[a-z0-9_]+):\s*$/gim, "$1: FALTA_COMPLETAR");
}

// ── Mapeo de claves del .md → campos del formulario ──────────
const KEY_ALIASES: Record<string, string> = {
  nombre_comercial: "name",
  razon_social: "name",
  industria: "industry",
  subcategoria: "subcategory",
  tipo_de_negocio: "businessType",
  modelo_de_negocio: "businessModel",
  pais: "country",
  provincia_estado: "state",
  ciudad: "city",
  sitio_web: "websiteUrl",
  descripcion_corta: "shortDescription",
  descripcion_larga: "fullDescription",
  valores_de_marca: "values",
  diferenciales: "competitiveAdvantages",
  ventajas_competitivas: "competitiveAdvantages",
  canales_actuales: "marketingActivities",
  tono_de_marca: "tone",
  palabras_que_no_usa: "avoid",
  temas_que_debe_evitar: "avoid",
  objetivo_principal: "goal",
  prioridad_actual: "goal",
  publico_objetivo_principal: "audienceSegments",
  edad_aproximada: "audienceAge",
  dolores_o_problemas: "audiencePain",
};

const LIST_FIELDS = new Set([
  "values",
  "competitiveAdvantages",
  "marketingActivities",
  "audienceSegments",
  "audiencePain",
  "audienceAge",
]);

function splitList(v: string): string[] {
  return v.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
}

const PLACEHOLDER = /^\s*\[.*\]\s*$/; // ej "[ChatGPT / Claude / ...]"

// Interpreta el valor según marcadores.
function interpret(value: string): { status: FieldStatus["status"]; clean: string } {
  const v = value.trim();
  if (!v || PLACEHOLDER.test(v) || /FALTA_COMPLETAR/i.test(v)) return { status: "missing", clean: "" };
  if (/INCOMPLETO/i.test(v)) return { status: "review", clean: stripMarker(v) };
  if (/REVISAR/i.test(v)) return { status: "review", clean: stripMarker(v) };
  if (/INFERIDO/i.test(v)) return { status: "suggested", clean: stripMarker(v) };
  return { status: "found", clean: v };
}

function stripMarker(v: string): string {
  return v
    .replace(/INCOMPLETO|REVISAR|INFERIDO/gi, "")
    .replace(/^[\s:.\-–—()]+|[\s:.\-–—()]+$/g, "")
    .trim();
}

export function parseExternalMarkdown(md: string): WebsiteAnalysis {
  const lines = md.split(/\r?\n/);
  const found: WebsiteFoundFields = {};
  const fieldStatuses: Record<string, FieldStatus> = {};
  const missingSet = new Set<string>();

  const conf = (s: FieldStatus["status"]): Confidence =>
    s === "found" ? "high" : s === "suggested" ? "medium" : "low";

  for (const raw of lines) {
    const line = raw.trim();
    const m = line.match(/^[-*]\s*([a-z0-9_]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const rawKey = m[1].toLowerCase();
    const key = KEY_ALIASES[rawKey];
    if (!key) continue;

    const { status, clean } = interpret(m[2]);
    const statusKey = statusKeyFor(key);
    // No degradar un estado ya bueno con uno peor del mismo campo
    const prev = fieldStatuses[statusKey]?.status;
    if (prev === "found") continue;

    if (status === "missing") {
      if (!prev) {
        fieldStatuses[statusKey] = { status: "missing", source: "external_ai" };
        missingSet.add(statusKey);
      }
      continue;
    }
    if (clean) applyField(found, key, clean);
    fieldStatuses[statusKey] = { status, confidence: conf(status), source: "external_ai" };
    missingSet.delete(statusKey);
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
  return has(f.name) && has(f.industry) && has(f.shortDescription) && has(f.competitiveAdvantages);
}

// Algunos keys mapean a sub-objetos; el status se guarda con la key visible del form.
function statusKeyFor(key: string): string {
  if (key === "tone" || key === "avoid") return "brandKit";
  if (key === "goal") return "goals";
  if (key.startsWith("audience")) return "audience";
  return key;
}

function applyField(found: WebsiteFoundFields, key: string, value: string) {
  if (LIST_FIELDS.has(key)) {
    const list = splitList(value);
    if (key === "audienceSegments") {
      found.audience = { ...(found.audience || {}), segments: list } as any;
    } else if (key === "audiencePain") {
      found.audience = { ...(found.audience || {}), painPoints: list } as any;
    } else if (key === "audienceAge") {
      found.audience = { ...(found.audience || {}), ageRanges: list } as any;
    } else {
      (found as any)[key] = list;
    }
    return;
  }
  switch (key) {
    case "businessModel": {
      const v = value.toUpperCase();
      found.businessModel =
        v.includes("B2B") && v.includes("B2C") ? "Ambos" : v.includes("B2B") ? "B2B" : v.includes("B2C") ? "B2C" : value;
      return;
    }
    case "tone":
      found.brandKit = {
        ...(found.brandKit || ({} as any)),
        voiceTone: { ...((found.brandKit as any)?.voiceTone || {}), toneTags: splitList(value) },
      } as any;
      return;
    case "avoid":
      found.brandKit = {
        ...(found.brandKit || ({} as any)),
        avoidList: [...(((found.brandKit as any)?.avoidList) || []), ...splitList(value)],
      } as any;
      return;
    case "goal":
      found.goals = { ...(found.goals || {}), marketingObjectives: value } as any;
      return;
    default:
      (found as any)[key] = value;
  }
}
