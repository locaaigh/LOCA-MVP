// ─────────────────────────────────────────────────────────────
// Log de calidad de los análisis de Eva (web / import .md).
// Escribe en `website_analysis_log` (migración 0011) con el cliente admin.
// NUNCA es fatal: si Supabase no está o falla, el análisis sigue igual
// (el log es para auditoría, no parte del flujo).
// SOLO server-side.
// ─────────────────────────────────────────────────────────────
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/supabase/admin";
import type { WebsiteAnalysis } from "@/lib/types";

export interface AnalysisLogEntry {
  source: "website" | "external_md";
  url?: string | null;
  fileName?: string | null;
  businessId?: string | null;
  provider?: string | null;
  model?: string | null;
  durationMs?: number | null;
  usage?: { inputTokens?: number; outputTokens?: number; costUsd?: number } | null;
  warning?: string | null;
  analysis: Pick<WebsiteAnalysis, "confidence" | "mode" | "fieldStatuses" | "foundFields">;
}

function countStatuses(fieldStatuses: WebsiteAnalysis["fieldStatuses"]) {
  const counts = { found: 0, suggested: 0, review: 0, missing: 0 };
  for (const v of Object.values(fieldStatuses || {})) {
    if (v.status === "found") counts.found++;
    else if (v.status === "suggested") counts.suggested++;
    else if (v.status === "review") counts.review++;
    else if (v.status === "missing") counts.missing++;
  }
  return counts;
}

export async function logWebsiteAnalysis(entry: AnalysisLogEntry): Promise<void> {
  if (!hasSupabaseAdminConfig()) return;
  try {
    const counts = countStatuses(entry.analysis.fieldStatuses);
    await getSupabaseAdmin()
      .from("website_analysis_log")
      .insert({
        source: entry.source,
        url: entry.url || null,
        file_name: entry.fileName || null,
        business_id: entry.businessId || null,
        provider: entry.provider || null,
        model: entry.model || null,
        success: !!entry.provider && entry.provider !== "mock",
        mode: entry.analysis.mode || null,
        confidence: entry.analysis.confidence ?? null,
        duration_ms: entry.durationMs ?? null,
        usage: entry.usage ?? null,
        warning: entry.warning || null,
        fields_found: counts.found,
        fields_suggested: counts.suggested,
        fields_review: counts.review,
        fields_missing: counts.missing,
        field_statuses: entry.analysis.fieldStatuses ?? null,
        found_fields: entry.analysis.foundFields ?? null,
      });
  } catch {
    // No-fatal: el log de calidad nunca rompe un análisis.
  }
}
