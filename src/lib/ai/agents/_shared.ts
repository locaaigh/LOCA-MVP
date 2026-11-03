import type { AiMeta, AiProvider } from "@/lib/types";
import { getTextProvider } from "../providers";
import { estimateTextCostUsd } from "../pricing";
import { getAgentConfig } from "../models";
import type { TextGenOptions, TokenUsage } from "../providers/types";

/** Opciones que un agente puede pasar a chatJson (ej: cachePrefix). */
type AgentChatOptions = Pick<TextGenOptions, "cachePrefix">;

export async function withTextAgent<T>(
  agentId: string,
  fallback: () => T,
  run: (
    chatJson: (system: string, user: string, opts?: AgentChatOptions) => Promise<unknown>,
    providerId: AiProvider
  ) => Promise<T>,
  warningPrefix = "IA no disponible"
): Promise<{ data: T; meta: AiMeta }> {
  const provider = getTextProvider();
  if (!provider) {
    return { data: fallback(), meta: { provider: "mock" } };
  }
  // Modelo y temperature por agente (models.ts). El modelo puede no estar
  // definido → usa el default del provider.
  const cfg = getAgentConfig(agentId);
  const model = cfg.model || provider.model;
  let usage: TokenUsage | undefined;
  const startedAt = Date.now();
  try {
    const data = await run(
      (system, user, opts) =>
        provider.chatJson(system, user, {
          onUsage: (u) => (usage = u),
          model: cfg.model,
          temperature: cfg.temperature,
          cachePrefix: opts?.cachePrefix,
        }),
      provider.id
    );
    return {
      data,
      meta: {
        provider: provider.id,
        model,
        durationMs: Date.now() - startedAt,
        usage: usage && { ...usage, costUsd: estimateTextCostUsd(model, usage) },
      },
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // Fallback a mock: meta.warning queda seteado y ai_usage_log lo
    // registra como success=false / is_mock=true (antes era invisible).
    return {
      data: fallback(),
      meta: {
        provider: "mock",
        durationMs: Date.now() - startedAt,
        warning: `${warningPrefix}. (${msg})`,
      },
    };
  }
}
