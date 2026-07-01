import type { AiProvider } from "@/lib/types";
import { getTextProvider } from "../providers";

export async function withTextAgent<T>(
  fallback: () => T,
  run: (
    chatJson: (system: string, user: string) => Promise<unknown>,
    providerId: AiProvider
  ) => Promise<T>,
  warningPrefix = "IA no disponible"
): Promise<{ data: T; meta: { provider: AiProvider; warning?: string } }> {
  const provider = getTextProvider();
  if (!provider) {
    return { data: fallback(), meta: { provider: "mock" } };
  }
  try {
    const data = await run((system, user) => provider.chatJson(system, user), provider.id);
    return { data, meta: { provider: provider.id } };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      data: fallback(),
      meta: { provider: "mock", warning: `${warningPrefix}. (${msg})` },
    };
  }
}
