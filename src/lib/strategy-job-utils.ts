import type { StrategyJob } from "./types";

/** Jobs en "generating" más viejos que esto se consideran colgados y se reinician. */
export const STRATEGY_JOB_STALE_MS = 60 * 1000;

export function isStrategyJobStale(job?: StrategyJob): boolean {
  if (job?.status !== "generating") return false;
  return Date.now() - new Date(job.updatedAt).getTime() > STRATEGY_JOB_STALE_MS;
}

export function mergeStrategyJob(
  local?: StrategyJob,
  server?: StrategyJob
): StrategyJob | undefined {
  if (!local) return server;
  if (!server) return local;
  const terminal = (s: StrategyJob["status"]) => s === "completed" || s === "failed";
  if (terminal(local.status) && !terminal(server.status)) return local;
  if (terminal(server.status) && !terminal(local.status)) return server;
  return (local.updatedAt || "") >= (server.updatedAt || "") ? local : server;
}
