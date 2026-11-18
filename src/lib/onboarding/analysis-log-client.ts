// ─────────────────────────────────────────────────────────────
// Avisos al log de calidad del backoffice desde el cliente. Fire-and-forget:
// nunca bloquean ni muestran errores en el onboarding (es auditoría, no flujo).
// ─────────────────────────────────────────────────────────────
import type { WebsiteAnalysis } from "@/lib/types";

/** Registra un import .md de IA externa (se parsea en el cliente, por eso el POST). */
export function logExternalMdImport(businessId: string, fileName: string, res: WebsiteAnalysis): void {
  fetch("/api/analysis-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName,
      businessId,
      analysis: {
        confidence: res.confidence,
        mode: res.mode,
        fieldStatuses: res.fieldStatuses,
        foundFields: res.foundFields,
      },
    }),
  }).catch(() => {});
}

/** Al terminar el onboarding: qué campos que la IA no pudo completar llenó el usuario a mano. */
export function reportManualCompletion(businessId: string, completed: string[]): void {
  fetch("/api/analysis-log/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ businessId, completed }),
  }).catch(() => {});
}
