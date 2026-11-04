// ─────────────────────────────────────────────────────────────
// Modelo y nivel de esfuerzo POR AGENTE (texto). Un solo lugar para cambiar
// el modelo de cada agente sin tocar el resto del código.
//
// NUEVO-v2 (oct-2026): se sube a la familia Claude 5.5 y se reemplaza
// `temperature` por `effort`. Verificado el 25-10-2026: los modelos 5.5
// responden 400 "`temperature` is deprecated for this model".
//
// Override por entorno (sin deploy de código):
//   AI_MODEL_STRATEGY=claude-sonnet-5-5   AI_EFFORT_STRATEGY=medium
//   (el id del agente en mayúsculas, con "-" → "_")
// ─────────────────────────────────────────────────────────────
import type { Effort } from "./providers/types";

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
  /** Modelo de texto (Anthropic). Si se usa OpenAI como provider, se ignora salvo que sea un id de OpenAI. */
  model: string;
  /** Profundidad de razonamiento: low | medium | high. Reemplaza a temperature. */
  effort: Effort;
  /** Tope de tokens de salida. */
  maxTokens?: number;
}

export const CLAUDE = {
  opus: "claude-opus-5-5",
  sonnet: "claude-sonnet-5-5",
  haiku: "claude-haiku-5-5",
} as const;

export const AGENT_MODELS: Record<AgentId, AgentModelConfig> = {
  // Analista de negocio: industria, B2B, producto vs servicio. Corre una vez. "Una IA mucho más power".
  "website-extract": { model: CLAUDE.opus, effort: "high", maxTokens: 8192 },
  // Lectura visual de la web (capturas) como plan B. También razonamiento de negocio.
  "website-vision": { model: CLAUDE.opus, effort: "high", maxTokens: 8192 },
  // Define todo lo demás. Una llamada por negocio.
  strategy: { model: CLAUDE.opus, effort: "high", maxTokens: 8192 },
  // Estructura el mes con brief por pieza. Una llamada.
  calendar: { model: CLAUDE.sonnet, effort: "medium", maxTokens: 12000 },
  // 12 a 20 llamadas por mes, con caching del contexto estable.
  content: { model: CLAUDE.sonnet, effort: "medium", maxTokens: 6000 },
  carousel: { model: CLAUDE.sonnet, effort: "medium", maxTokens: 8192 },
  // Edición puntual sobre una pieza existente.
  "content-feedback": { model: CLAUDE.haiku, effort: "medium", maxTokens: 6000 },
  "product-description": { model: CLAUDE.haiku, effort: "low", maxTokens: 2048 },
  "ads-meta": { model: CLAUDE.sonnet, effort: "medium", maxTokens: 6000 },
  "ads-google": { model: CLAUDE.sonnet, effort: "medium", maxTokens: 6000 },
  // Veredicto estructurado por imagen (visión). 1 a 2 segundos, centavos.
  "image-qa": { model: CLAUDE.haiku, effort: "low", maxTokens: 1024 },
};

function envKey(agentId: string): string {
  return agentId.toUpperCase().replace(/-/g, "_");
}

export function getAgentConfig(agentId: string): AgentModelConfig {
  const base = AGENT_MODELS[agentId as AgentId] || { model: CLAUDE.sonnet, effort: "medium" as Effort };
  const model = process.env[`AI_MODEL_${envKey(agentId)}`]?.trim() || base.model;
  const effortRaw = process.env[`AI_EFFORT_${envKey(agentId)}`]?.trim().toLowerCase();
  const effort: Effort = effortRaw === "low" || effortRaw === "medium" || effortRaw === "high" ? effortRaw : base.effort;
  return { ...base, model, effort };
}
