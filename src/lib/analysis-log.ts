// ─────────────────────────────────────────────────────────────
// Log de calidad de los análisis de Eva (web / import .md).
// Escribe en `website_analysis_log` (migración 0011) con el cliente admin.
// NUNCA es fatal: si Supabase no está o falla, el análisis sigue igual
// (el log es para auditoría, no parte del flujo).
// SOLO server-side.
// ─────────────────────────────────────────────────────────────
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/supabase/admin";
import type { WebsiteAnalysis } from "@/lib/types";
import { emptyBusiness } from "@/lib/store";
import {
  QUESTIONS,
  isQuestionRequired,
  missingRequiredQuestions,
  applyFieldConfigOverrides,
} from "@/lib/business-questions";
import { getFieldConfigOverrides } from "@/lib/onboarding/field-config";
import { applyAnalysisToBusiness } from "@/lib/onboarding/apply-analysis";

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

/**
 * Vista del ONBOARDING real: aplica el análisis sobre un negocio vacío (el
 * mismo merge que hace el cliente) y evalúa el registro de preguntas con los
 * overrides del admin. Devuelve qué obligatorios quedarían faltando — lo que
 * de verdad se le va a pedir al usuario, no la vista agregada del analizador.
 */
async function onboardingView(analysis: AnalysisLogEntry["analysis"]) {
  applyFieldConfigOverrides(await getFieldConfigOverrides());
  const biz = applyAnalysisToBusiness(emptyBusiness("anon"), analysis as WebsiteAnalysis);
  const missing = missingRequiredQuestions(biz).map((q) => ({ id: q.id, label: q.label }));
  const requiredTotal = QUESTIONS.filter(isQuestionRequired).length;
  return { missing, requiredTotal };
}

export async function logWebsiteAnalysis(entry: AnalysisLogEntry): Promise<void> {
  if (!hasSupabaseAdminConfig()) return;
  try {
    const counts = countStatuses(entry.analysis.fieldStatuses);
    const row: Record<string, unknown> = {
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
    };
    try {
      const view = await onboardingView(entry.analysis);
      row.onboarding_required_total = view.requiredTotal;
      row.onboarding_required_missing = view.missing.length;
      row.onboarding_missing = view.missing;
    } catch {
      // Si el cómputo falla, se loguea igual sin la vista del onboarding.
    }
    const { error } = await getSupabaseAdmin().from("website_analysis_log").insert(row);
    if (error && /onboarding_/.test(error.message)) {
      // Migración 0012 sin correr: reintento sin las columnas nuevas para no
      // perder el registro.
      delete row.onboarding_required_total;
      delete row.onboarding_required_missing;
      delete row.onboarding_missing;
      await getSupabaseAdmin().from("website_analysis_log").insert(row);
    }
  } catch {
    // No-fatal: el log de calidad nunca rompe un análisis.
  }
}
