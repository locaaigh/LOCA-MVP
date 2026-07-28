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
        usage: usage && { ...usage, costUsd: estimateTextCostUsd(provider.model, usage) },
      },
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      data: fallback(),
      meta: { provider: "mock", warning: `${warningPrefix}. (${msg})` },
    };
  }
}
