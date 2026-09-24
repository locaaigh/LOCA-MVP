// ─────────────────────────────────────────────────────────────
// Adapter de métricas de LinkedIn. Placeholder registrado: la integración de
// publicación ya existe, pero las métricas necesitan scopes de lectura
// (r_organization_social, r_member_postAnalytics) que todavía no pedimos
// (ver backlog de producto). Devuelve coming_soon si hay conexión activa, para
// que la UI muestre la pestaña como "Próximamente" sin romper nada.
// ─────────────────────────────────────────────────────────────
import type { ConnectionRow } from "@/lib/connections/repository";
import type { PlatformMetrics } from "../types";
import { basePlatform, type MetricsWindow } from "./shared";

export async function fetchLinkedInMetrics(
  conn: ConnectionRow | null,
  window: MetricsWindow
): Promise<PlatformMetrics> {
  const connected = !!(conn && conn.status === "active" && conn.account_id);
  return basePlatform("linkedin", connected ? "coming_soon" : "not_connected", window, {
    accountName: conn?.account_name || undefined,
  });
}
