// ─────────────────────────────────────────────────────────────
// Modelo y temperature POR AGENTE (texto). Un solo lugar para cambiar
// el modelo de cada agente sin tocar el resto del código.
//
// ADAPTACIÓN LOCA: la entrega de Sebi proponía Claude 5.5 + `effort`.
// Nosotros usamos NUESTRO modelo productivo: `claude-sonnet-4-6`, que
// acepta `temperature` (los 5.5 la rechazan con 400). Por eso acá cada
// agente lleva `temperature` (no `effort`). Si algún día se sube a 5.5,
// anthropic-text.ts ya mandaría `effort` para esos ids.
//
// Override por entorno (sin deploy de código):
//   AI_MODEL_STRATEGY=claude-sonnet-4-6   AI_TEMPERATURE_STRATEGY=0.7
//   (el id del agente en mayúsculas, con "-" → "_")
// ─────────────────────────────────────────────────────────────

export type AgentId =
  | "strategy"
  | "calendar"
  | "content"
  | "carousel"
  | "content-feedback"
  | "website-extract"
  | "website-vision"
  | "product-description"
  | "ads-meta"
  | "ads-google"
  | "image-qa";

export interface AgentModelConfig {
  /** Modelo de texto (Anthropic). Nuestro default productivo: claude-sonnet-4-6. */
  model: string;
  /** 0..1. Baja para parsers/análisis (precisión), alta para contenido (variedad). */
  temperature: number;
  /** Tope de tokens de salida. */
  maxTokens?: number;
}

/** Nuestro modelo productivo de texto. Un solo modelo para todos los agentes. */
export const LOCA_TEXT_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export const AGENT_MODELS: Record<AgentId, AgentModelConfig> = {
  // Analista de negocio: industria, B2B, producto vs servicio. Precisión → temp baja.
  "website-extract": { model: LOCA_TEXT_MODEL, temperature: 0.4, maxTokens: 8192 },
  // Lectura visual de la web (capturas) como plan B. También razonamiento de negocio.
  "website-vision": { model: LOCA_TEXT_MODEL, temperature: 0.4, maxTokens: 8192 },
  // Define todo lo demás. Una llamada por negocio. Consistencia.
  strategy: { model: LOCA_TEXT_MODEL, temperature: 0.7, maxTokens: 8192 },
  // Estructura el mes con brief por pieza. Una llamada. Consistencia.
  calendar: { model: LOCA_TEXT_MODEL, temperature: 0.7, maxTokens: 12000 },
  // 12 a 20 llamadas por mes, con caching del contexto estable. Variedad entre piezas.
  content: { model: LOCA_TEXT_MODEL, temperature: 0.9, maxTokens: 6000 },
  // Narrativa de slides del carrusel. Variedad.
  carousel: { model: LOCA_TEXT_MODEL, temperature: 0.9, maxTokens: 8192 },
  // Edición puntual sobre una pieza existente.
  "content-feedback": { model: LOCA_TEXT_MODEL, temperature: 0.8, maxTokens: 6000 },
  "product-description": { model: LOCA_TEXT_MODEL, temperature: 0.3, maxTokens: 2048 },
  "ads-meta": { model: LOCA_TEXT_MODEL, temperature: 0.8, maxTokens: 6000 },
  "ads-google": { model: LOCA_TEXT_MODEL, temperature: 0.8, maxTokens: 6000 },
  // Veredicto estructurado por imagen (visión). Determinístico → temp baja.
  "image-qa": { model: LOCA_TEXT_MODEL, temperature: 0.2, maxTokens: 1024 },
};

function envKey(agentId: string): string {
  return agentId.toUpperCase().replace(/-/g, "_");
}

export function getAgentConfig(agentId: string): AgentModelConfig {
  const base =
    AGENT_MODELS[agentId as AgentId] || { model: LOCA_TEXT_MODEL, temperature: 0.7 };
  const model = process.env[`AI_MODEL_${envKey(agentId)}`]?.trim() || base.model;
  const tempRaw = process.env[`AI_TEMPERATURE_${envKey(agentId)}`]?.trim();
  const tempParsed = tempRaw != null ? Number(tempRaw) : NaN;
  const temperature = Number.isFinite(tempParsed) ? tempParsed : base.temperature;
  return { ...base, model, temperature };
}
