import type { AiMeta } from "@/lib/types";

export type AgentResult<T> = { data: T; meta: AiMeta };

export interface Agent<TInput, TOutput> {
  readonly id: string;
  run(input: TInput): Promise<AgentResult<TOutput>>;
}
