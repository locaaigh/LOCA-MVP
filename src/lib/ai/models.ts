// ─────────────────────────────────────────────────────────────
// Configuración de modelo y temperature POR AGENTE. Un solo lugar para
// que A2 (costo vs calidad) cambie el modelo de cada agente sin tocar el
// resto del código.
//
// F1 (arranque): `model` va sin definir → cada agente usa el modelo default
// del provider activo (hoy claude-sonnet-4-6). Cuando A2 decida el modelo por
// agente, se completa `model` acá y nada más cambia.
//
// La `temperature` sí se fija ya, según la naturaleza de cada tarea
// (A3/B1 F1.3): baja para parsers (precisión), alta para contenido (variedad).
// ─────────────────────────────────────────────────────────────

export type AgentId =
  | "strategy"
  | "calendar"
  | "content"
  | "content-feedback"
  | "website-extract"
  | "product-description"
  | "ads-meta"
  | "ads-google";

export interface AgentModelConfig {
  /** Modelo específico. Si se omite, usa el default del provider activo. */
  model?: string;
  /** 0..1. Si se omite, usa el default del proveedor. */
  temperature?: number;
}

export const AGENT_MODELS: Record<AgentId, AgentModelConfig> = {
  strategy: { temperature: 0.7 }, // consistencia
  calendar: { temperature: 0.7 }, // consistencia
  content: { temperature: 0.9 }, // variedad entre piezas
  "content-feedback": { temperature: 0.8 },
  // Analista de negocio (no un parser): necesita razonar industria/B2B/producto-vs-servicio
  // con criterio, por eso 0.4 (suficiente para razonar, bajo para no inventar). Si se quiere
  // "más power", acá se puede fijar un `model` más potente sin tocar el resto del pipeline.
  "website-extract": { temperature: 0.4 },
  "product-description": { temperature: 0.3 },
  "ads-meta": { temperature: 0.8 },
  "ads-google": { temperature: 0.8 },
};

export function getAgentConfig(agentId: string): AgentModelConfig {
  return AGENT_MODELS[agentId as AgentId] || {};
}
