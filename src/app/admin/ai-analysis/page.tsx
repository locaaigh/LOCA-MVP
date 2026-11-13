"use client";

import { useEffect, useState } from "react";
import { Button, Card, Modal, useToast } from "@/components/ui";
import { FileText, Globe } from "lucide-react";

interface LogRow {
  id: number;
  created_at: string;
  source: "website" | "external_md";
  url: string | null;
  file_name: string | null;
  business_id: string | null;
  provider: string | null;
  model: string | null;
  success: boolean;
  mode: string | null;
  confidence: number | null;
  duration_ms: number | null;
  usage: { inputTokens?: number; outputTokens?: number; costUsd?: number } | null;
  warning: string | null;
  fields_found: number;
  fields_suggested: number;
  fields_review: number;
  fields_missing: number;
}

interface LogDetail extends LogRow {
  field_statuses: Record<string, { status: string; confidence?: string; source?: string }> | null;
  found_fields: Record<string, unknown> | null;
}

const STATUS_PILL: Record<string, string> = {
  found: "bg-lima-100 text-lima-700 dark:bg-lima-900/50 dark:text-lima-300",
  suggested: "bg-loca-100 text-loca-700 dark:bg-loca-900/50 dark:text-loca-300",
  review: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  missing: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};
const STATUS_LABEL: Record<string, string> = {
  found: "Detectado",
  suggested: "Sugerido",
  review: "A revisar",
  missing: "No pudo",
};

function preview(v: unknown): string {
  if (v == null || v === "") return "—";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > 180 ? `${s.slice(0, 180)}…` : s;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("es-AR")} ${d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`;
}

export default function WebAnalysisAdminPage() {
  const { show, node } = useToast();
  const [rows, setRows] = useState<LogRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [migrationPending, setMigrationPending] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [detail, setDetail] = useState<LogDetail | null>(null);

  async function load(offset = 0) {
    const res = await fetch(`/api/admin/analysis-log?limit=50&offset=${offset}`);
    if (!res.ok) throw new Error(String(res.status));
    const json = await res.json();
    setMigrationPending(!!json.migrationPending);
    setTotal(json.total ?? 0);
    setRows((prev) => (offset === 0 ? json.rows : [...(prev ?? []), ...json.rows]));
  }

  useEffect(() => {
    load().catch(() => show("No se pudo cargar el log."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openDetail(id: number) {
    try {
      const res = await fetch(`/api/admin/analysis-log?id=${id}`);
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      setDetail(json.row);
    } catch {
      show("No se pudo cargar el detalle.");
    }
  }

  return (
    <div className="space-y-6">
      {node}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Análisis de IA</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Registro de calidad de los análisis que hace la IA. Por ahora: análisis de webs del
          onboarding (más adelante se suman otros tipos de análisis acá).
        </p>
      </div>

      {/* ── Sección: Análisis de web ─────────────────────────── */}
      <div>
        <h2 className="text-lg font-bold tracking-tight text-foreground">Análisis de web</h2>
        <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">
          Cada vez que Eva analiza una web (o se importa un .md de otra IA) queda registrado:
          qué modelo se usó y qué campos pudo completar — se concrete o no el onboarding. Hacé
          click en una fila para ver el detalle campo por campo.
        </p>
      </div>

      {/* Referencia: qué significa cada estado de campo */}
      <Card className="overflow-x-auto p-0">
        <h3 className="border-b border-border px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Referencia: estados de los campos (✓ / ~ / ⚠ / ✗)
        </h3>
        <table className="w-full min-w-[640px] text-xs">
          <tbody>
            <tr className="border-b border-border align-top">
              <td className="whitespace-nowrap px-4 py-2 font-bold text-lima-700 dark:text-lima-300">✓ Detectado</td>
              <td className="px-4 py-2 text-foreground-soft">
                Dato extraído directo de la web, sin interpretación (redes, URL, nombre claro, descripción sólida). Los más confiables: la IA no los pisa.
              </td>
            </tr>
            <tr className="border-b border-border align-top">
              <td className="whitespace-nowrap px-4 py-2 font-bold text-loca-600 dark:text-loca-300">~ Sugerido</td>
              <td className="px-4 py-2 text-foreground-soft">
                Inferido por la IA razonando sobre el contenido (industria, tipo de negocio, audiencia, productos). Editable, con confianza alta/media/baja.
              </td>
            </tr>
            <tr className="border-b border-border align-top">
              <td className="whitespace-nowrap px-4 py-2 font-bold text-amber-700 dark:text-amber-300">⚠ A revisar</td>
              <td className="px-4 py-2 text-foreground-soft">
                Sugerencia que exige confirmación explícita del usuario antes de valer (ej: productos detectados sin IA).
              </td>
            </tr>
            <tr className="align-top">
              <td className="whitespace-nowrap px-4 py-2 font-bold text-red-600 dark:text-red-300">✗ No pudo</td>
              <td className="px-4 py-2 text-foreground-soft">
                Sin señal ni inferencia posible: el usuario lo completa a mano en &quot;Completá lo que falta&quot;. <strong>✗ alto = la IA entendió poco de esa web</strong> — esas filas son las que vale la pena abrir.
              </td>
            </tr>
          </tbody>
        </table>
      </Card>

      {migrationPending && (
        <Card className="border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          Falta correr la migración <code>0011_website_analysis_log.sql</code> en Supabase para
          empezar a registrar análisis.
        </Card>
      )}

      {!rows ? (
        <Card className="py-12 text-center text-sm text-muted-foreground">Cargando…</Card>
      ) : rows.length === 0 ? (
        <Card className="py-12 text-center text-sm text-muted-foreground">
          Todavía no hay análisis registrados.
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Origen</th>
                <th className="px-4 py-3">Modelo</th>
                <th className="px-4 py-3">Resultado</th>
                <th className="px-4 py-3" title="Detectados / Sugeridos / A revisar / No pudo">Campos ✓/~/⚠/✗</th>
                <th className="px-4 py-3">Conf.</th>
                <th className="px-4 py-3">Duración</th>
                <th className="px-4 py-3">Costo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => void openDetail(r.id)}
                  className="cursor-pointer border-b border-border transition last:border-b-0 hover:bg-surface-subtle"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-foreground-soft">{fmtDate(r.created_at)}</td>
                  <td className="max-w-[220px] px-4 py-3">
                    <span className="flex items-center gap-1.5 truncate font-semibold text-foreground">
                      {r.source === "website" ? (
                        <Globe className="h-3.5 w-3.5 shrink-0 text-accent" />
                      ) : (
                        <FileText className="h-3.5 w-3.5 shrink-0 text-accent" />
                      )}
                      <span className="truncate">
                        {r.source === "website" ? (r.url || "—").replace(/^https?:\/\//, "") : r.file_name || "import .md"}
                      </span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-foreground-soft">
                    {r.source === "external_md" ? "IA externa" : r.model || r.provider || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {r.success || r.source === "external_md" ? (
                      <span className="rounded-full bg-lima-100 px-2 py-0.5 text-[11px] font-bold text-lima-700 dark:bg-lima-900/50 dark:text-lima-300">OK</span>
                    ) : (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700 dark:bg-red-900/40 dark:text-red-300" title={r.warning || undefined}>Falló</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-foreground-soft">
                    <span className="font-semibold text-lima-700 dark:text-lima-300">{r.fields_found}</span>
                    {" / "}
                    <span className="font-semibold text-loca-600 dark:text-loca-300">{r.fields_suggested}</span>
                    {" / "}
                    <span className="font-semibold text-amber-700 dark:text-amber-300">{r.fields_review}</span>
                    {" / "}
                    <span className="font-semibold text-red-600 dark:text-red-300">{r.fields_missing}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-foreground-soft">
                    {r.confidence != null ? `${Math.round(Number(r.confidence) * 100)}%` : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-foreground-soft">
                    {r.duration_ms != null ? `${(r.duration_ms / 1000).toFixed(1)} s` : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-foreground-soft">
                    {r.usage?.costUsd != null ? `$${r.usage.costUsd.toFixed(3)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {rows && rows.length < total && (
        <div className="text-center">
          <Button
            variant="outline"
            disabled={loadingMore}
            onClick={() => {
              setLoadingMore(true);
              load(rows.length)
                .catch(() => show("No se pudo cargar más."))
                .finally(() => setLoadingMore(false));
            }}
          >
            Cargar más ({rows.length} de {total})
          </Button>
        </div>
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Detalle del análisis">
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Origen</p>
                <p className="break-all font-semibold text-foreground">
                  {detail.source === "website" ? detail.url : detail.file_name || "import .md"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Modelo</p>
                <p className="font-semibold text-foreground">
                  {detail.source === "external_md" ? "IA externa (.md)" : `${detail.provider || "—"} · ${detail.model || "—"}`}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Fecha</p>
                <p className="font-semibold text-foreground">{fmtDate(detail.created_at)}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Confianza</p>
                <p className="font-semibold tabular-nums text-foreground">
                  {detail.confidence != null ? `${Math.round(Number(detail.confidence) * 100)}%` : "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Duración</p>
                <p className="font-semibold tabular-nums text-foreground">
                  {detail.duration_ms != null ? `${(detail.duration_ms / 1000).toFixed(1)} s` : "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Tokens / costo</p>
                <p className="font-semibold tabular-nums text-foreground">
                  {detail.usage
                    ? `${detail.usage.inputTokens ?? 0}→${detail.usage.outputTokens ?? 0}${detail.usage.costUsd != null ? ` · $${detail.usage.costUsd.toFixed(3)}` : ""}`
                    : "—"}
                </p>
              </div>
            </div>

            {detail.warning && (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                {detail.warning}
              </p>
            )}

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[520px] text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2">Campo</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Conf.</th>
                    <th className="px-3 py-2">Qué generó Eva</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(detail.field_statuses || {}).map(([key, st]) => (
                    <tr key={key} className="border-b border-border align-top last:border-b-0">
                      <td className="whitespace-nowrap px-3 py-2 font-semibold text-foreground">{key}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_PILL[st.status] || "bg-surface-muted text-muted-foreground"}`}>
                          {STATUS_LABEL[st.status] || st.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-foreground-soft">{st.confidence || "—"}</td>
                      <td className="px-3 py-2 text-foreground-soft">
                        {preview((detail.found_fields as Record<string, unknown> | null)?.[key])}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <details>
              <summary className="cursor-pointer text-xs font-semibold text-faint transition hover:text-foreground-muted">
                Ver snapshot completo (JSON)
              </summary>
              <pre className="mt-2 max-h-72 overflow-auto rounded-xl bg-surface-muted p-3 text-[11px] leading-relaxed text-foreground-soft">
                {JSON.stringify(detail.found_fields, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </Modal>
    </div>
  );
}
