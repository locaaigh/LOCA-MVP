// ─────────────────────────────────────────────────────────────
// Gate SERVER-SIDE de la estrategia (Fase 2 del backoffice).
// El cliente ya valida los críticos antes de llamar, pero hasta ahora nada
// lo re-chequeaba en el servidor: cualquier request directa podía generar
// una estrategia con datos críticos vacíos. Acá se valida con la MISMA
// definición que usa toda la app (business-questions + overrides del
// backoffice), así el gate del cliente y el del servidor nunca divergen.
// ─────────────────────────────────────────────────────────────
import type { Business } from "@/lib/types";
import { applyFieldConfigOverrides, missingCriticalQuestions } from "@/lib/business-questions";
import { getFieldConfigOverrides } from "./field-config";

export interface MissingCritical {
  id: string;
  label: string;
}

/** Críticos faltantes según la config efectiva (código + overrides, caché 5 min). */
export async function missingCriticalsServer(b: Business): Promise<MissingCritical[]> {
  applyFieldConfigOverrides(await getFieldConfigOverrides());
  return missingCriticalQuestions(b).map((q) => ({ id: q.id, label: q.label }));
}
