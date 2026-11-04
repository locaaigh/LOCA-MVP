import type { AiMeta, AiProvider } from "@/lib/types";
import type { ZodTypeAny, z } from "zod";
import { getTextProvider } from "../providers";
import { estimateTextCostUsd } from "../pricing";
import { getAgentConfig } from "../models";
import type { InputImage, TextGenOptions, TokenUsage } from "../providers/types";
import { formatZodError } from "../shared/schemas";

/** Opciones que un agente puede pasar a chatJson. */
export interface AgentChatOptions<S extends ZodTypeAny = ZodTypeAny> {
  /** Bloque estable cacheable (contexto del negocio). */
  cachePrefix?: string;
  /** Imágenes de entrada (visión). */
  images?: InputImage[];
  /**
   * Schema Zod de la salida. Si no valida, se reintenta UNA vez pasándole al
   * modelo el error de formato; si vuelve a fallar, se lanza y cae al mock.
   */
  schema?: S;
}

export class AgentOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentOutputError";
  }
}

export type AgentChatJson = <S extends ZodTypeAny = ZodTypeAny>(
  system: string,
  user: string,
  opts?: AgentChatOptions<S>
) => Promise<S extends ZodTypeAny ? z.infer<S> : unknown>;

export async function withTextAgent<T>(
  agentId: string,
  fallback: () => T,
  run: (chatJson: AgentChatJson, providerId: AiProvider) => Promise<T>,
  warningPrefix = "IA no disponible"
): Promise<{ data: T; meta: AiMeta }> {
  const provider = getTextProvider();
  if (!provider) {
    return { data: fallback(), meta: { provider: "mock", warning: `${warningPrefix}. (sin proveedor de texto)` } };
  }
  // Modelo y effort por agente (models.ts), con override por env.
  const cfg = getAgentConfig(agentId);
  const model = cfg.model;
  const usage: TokenUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 };
  let repaired = false;
  const startedAt = Date.now();

  const chatJson: AgentChatJson = async (system, user, opts) => {
    const base: TextGenOptions = {
      onUsage: (u) => {
        usage.inputTokens += u.inputTokens;
        usage.outputTokens += u.outputTokens;
        usage.cacheReadTokens = (usage.cacheReadTokens ?? 0) + (u.cacheReadTokens ?? 0);
      },
      model,
      effort: cfg.effort,
      maxTokens: cfg.maxTokens,
      cachePrefix: opts?.cachePrefix,
      images: opts?.images,
    };
    const raw = await provider.chatJson(system, user, base);
    if (!opts?.schema) return raw as never;
    const first = opts.schema.safeParse(raw);
    if (first.success) return first.data as never;

    // Reintento de reparación: el modelo recibe su salida y el error de formato.
    repaired = true;
    const repairUser = `${user}

TU RESPUESTA ANTERIOR NO CUMPLIÓ EL FORMATO. Errores:
${formatZodError(first.error)}

Respuesta anterior (corregila, no la repitas igual):
${JSON.stringify(raw).slice(0, 6000)}

Devolvé el JSON COMPLETO corregido, con todos los campos pedidos.`;
    const second = await provider.chatJson(system, repairUser, base);
    const parsed = opts.schema.safeParse(second);
    if (parsed.success) return parsed.data as never;
    throw new AgentOutputError(`Salida inválida tras reintento: ${formatZodError(parsed.error).slice(0, 400)}`);
  };

  try {
    const data = await run(chatJson, provider.id);
    return {
      data,
      meta: {
        provider: provider.id,
        model,
        durationMs: Date.now() - startedAt,
        usage: { ...usage, costUsd: estimateTextCostUsd(model, usage) },
        ...(repaired ? { repaired: true } : {}),
      },
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // Fallback a mock: meta.warning queda seteado y ai_usage_log lo registra
    // como success=false / is_mock=true. Los agentes además marcan isMock en la pieza.
    return {
      data: fallback(),
      meta: {
        provider: "mock",
        model,
        durationMs: Date.now() - startedAt,
        usage: { ...usage, costUsd: estimateTextCostUsd(model, usage) },
        warning: `${warningPrefix}. (${msg})`,
      },
    };
  }
}
