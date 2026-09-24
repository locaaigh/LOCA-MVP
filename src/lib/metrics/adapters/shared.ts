// ─────────────────────────────────────────────────────────────
// Helpers compartidos por los adapters de métricas.
// ─────────────────────────────────────────────────────────────
import type { MetricsPeriod, PlatformId, PlatformMetrics, PlatformStatus } from "../types";

export type MetricsWindow = { days: number; from: string; to: string };

/** Ventana de fechas del período (YYYY-MM-DD), para since/until de Meta. */
export function computeWindow(period: MetricsPeriod): MetricsWindow {
  const days = period === "7d" ? 7 : 30;
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { days, from: fmt(from), to: fmt(to) };
}

/**
 * Un error de la Graph API es "de permiso" cuando el token se emitió sin el
 * scope (ej. read_insights pendiente de aprobación). La solución es reconectar,
 * no cambiar código. Se distingue del resto para mostrar el CTA correcto.
 */
export function isPermissionError(msg: string): boolean {
  return /permiss|#10\b|#\s*10\b|#200|#283|read_insights|requires the|no autorizad|not authorized|oauth/i.test(
    msg
  );
}

/** Deriva el status de una plataforma a partir de lo que se pudo traer. */
export function deriveStatus(gotData: boolean, errors: string[]): PlatformStatus {
  if (gotData) return "ok";
  if (errors.length === 0) return "ok"; // sin errores y sin datos = ceros legítimos
  return errors.some(isPermissionError) ? "permission_error" : "error";
}

// ── Parsing de respuestas de insights (data: [{ name, values:[{value}], total_value }]) ──

type InsightValue = { value?: number | Record<string, number> };
type Insight = { name: string; values?: InsightValue[]; total_value?: { value?: number } };

/** Suma los valores diarios de una métrica en la ventana (métricas acumulables). */
export function sumDaily(data: Insight[], name: string): number | undefined {
  const m = data.find((x) => x.name === name);
  if (!m) return undefined;
  if (typeof m.total_value?.value === "number") return m.total_value.value;
  if (!m.values?.length) return undefined;
  return m.values.reduce((a, v) => a + (typeof v.value === "number" ? v.value : 0), 0);
}

/** Último valor diario de una métrica (para métricas de "stock", ej. seguidores). */
export function latestDaily(data: Insight[], name: string): number | undefined {
  const m = data.find((x) => x.name === name);
  const last = m?.values?.[m.values.length - 1]?.value;
  return typeof last === "number" ? last : undefined;
}

/** Base de un PlatformMetrics con estado (para not_connected / coming_soon). */
export function basePlatform(
  platform: PlatformId,
  status: PlatformStatus,
  window: MetricsWindow,
  extra?: Partial<PlatformMetrics>
): PlatformMetrics {
  return {
    platform,
    status,
    period: { from: window.from, to: window.to },
    account: {},
    posts: [],
    ...extra,
  };
}
