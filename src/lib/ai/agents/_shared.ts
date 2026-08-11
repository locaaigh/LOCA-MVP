import type { AiMeta, AiProvider } from "@/lib/types";
import { getTextProvider } from "../providers";
import { estimateTextCostUsd } from "../pricing";
import type { TokenUsage } from "../providers/types";

export async function withTextAgent<T>(
  fallback: () => T,
  run: (
    chatJson: (system: string, user: string) => Promise<unknown>,
    providerId: AiProvider
  ) => Promise<T>,
  warningPrefix = "IA no disponible"
): Promise<{ data: T; meta: AiMeta }> {
  const provider = getTextProvider();
  if (!provider) {
    return { data: fallback(), meta: { provider: "mock" } };
  }
  let usage: TokenUsage | undefined;
  const startedAt = Date.now();
  try {
    const data = await run(
      (system, user) => provider.chatJson(system, user, (u) => (usage = u)),
      provider.id
    );
    return {
      data,
      meta: {
        provider: provider.id,
        model: provider.model,
        durationMs: Date.now() - startedAt,
        usage: usage && { ...usage, costUsd: estimateTextCostUsd(provider.model, usage) },
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
