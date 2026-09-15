// ─────────────────────────────────────────────────────────────
// Página de estado del sistema (server component, datos en vivo).
// Chequea base de datos + latencia, tablas críticas, IA e integraciones.
// Todos los chequeos tienen timeout para que la página nunca se cuelgue,
// incluso si Supabase está caído (fue el incidente del 14/09).
// ─────────────────────────────────────────────────────────────
import { hasSupabaseAdminConfig, getSupabaseAdmin } from "@/lib/supabase/admin";
import { getAiRuntimeStatus } from "@/lib/ai/providers";
import { hasMetaConfig } from "@/lib/meta/config";
import { hasInstagramConfig } from "@/lib/instagram/config";
import { hasLinkedInConfig } from "@/lib/linkedin/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Tone = "ok" | "bad" | "off";
type Check = { label: string; tone: Tone; detail: string };

function withTimeout<T>(p: Promise<T>, ms: number, onTimeout: T): Promise<T> {
  return Promise.race([p, new Promise<T>((r) => setTimeout(() => r(onTimeout), ms))]);
}

async function checkSupabase(): Promise<Check> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return { label: "Supabase (auth)", tone: "off", detail: "no configurado" };
  const start = Date.now();
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anon },
      signal: ctrl.signal,
      cache: "no-store",
    });
    clearTimeout(t);
    const ms = Date.now() - start;
    return res.ok
      ? { label: "Supabase (auth)", tone: "ok", detail: `responde · ${ms}ms` }
      : { label: "Supabase (auth)", tone: "bad", detail: `HTTP ${res.status} · ${ms}ms` };
  } catch (e) {
    return {
      label: "Supabase (auth)",
      tone: "bad",
      detail: e instanceof Error ? e.message.slice(0, 60) : "sin respuesta",
    };
  }
}

async function checkTable(name: string): Promise<Check> {
  if (!hasSupabaseAdminConfig()) return { label: `Tabla ${name}`, tone: "off", detail: "admin no configurado" };
  const run = (async (): Promise<Check> => {
    const start = Date.now();
    const { error } = await getSupabaseAdmin().from(name).select("*").limit(0);
    const ms = Date.now() - start;
    return error
      ? { label: `Tabla ${name}`, tone: "bad", detail: error.message.slice(0, 60) }
      : { label: `Tabla ${name}`, tone: "ok", detail: `existe · ${ms}ms` };
  })();
  return withTimeout(run, 6000, { label: `Tabla ${name}`, tone: "bad", detail: "timeout" });
}

function Dot({ tone }: { tone: Tone }) {
  const color = tone === "ok" ? "bg-emerald-500" : tone === "bad" ? "bg-red-500" : "bg-zinc-400";
  return (
    <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${color}`}>
      {tone === "ok" && (
        <span className={`block h-2.5 w-2.5 animate-ping rounded-full ${color} opacity-60`} />
      )}
    </span>
  );
}

function Row({ c }: { c: Check }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-3 last:border-0">
      <span className="flex items-center gap-3">
        <Dot tone={c.tone} />
        <span className="text-sm font-medium text-foreground">{c.label}</span>
      </span>
      <span className="text-right text-xs text-muted-foreground">{c.detail}</span>
    </div>
  );
}

function Section({ title, checks }: { title: string; checks: Check[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-faint">{title}</h2>
      <div className="mt-1">
        {checks.map((c) => (
          <Row key={c.label} c={c} />
        ))}
      </div>
    </div>
  );
}

export default async function StatusPage() {
  const [supabase, tBusinesses, tConnections, tContents] = await Promise.all([
    checkSupabase(),
    checkTable("businesses"),
    checkTable("social_connections"),
    checkTable("contents"),
  ]);

  const ai = getAiRuntimeStatus();
  const cfg = (ok: boolean): Tone => (ok ? "ok" : "off");

  const dbChecks: Check[] = [supabase, tBusinesses, tConnections, tContents];

  const aiChecks: Check[] = [
    {
      label: "IA de texto",
      tone: ai.hasTextAI ? "ok" : "off",
      detail: ai.hasTextAI ? `${ai.textProvider} · ${ai.textModel}` : "no configurada",
    },
    {
      label: "IA de imagen",
      tone: ai.hasImageAI ? "ok" : "off",
      detail: ai.hasImageAI ? `${ai.imageProvider} · ${ai.imageModel}` : "no configurada",
    },
  ];

  const integrationChecks: Check[] = [
    { label: "Meta (Facebook / Instagram)", tone: cfg(hasMetaConfig()), detail: hasMetaConfig() ? "configurado" : "sin env vars" },
    { label: "Instagram Login", tone: cfg(hasInstagramConfig()), detail: hasInstagramConfig() ? "configurado" : "sin env vars" },
    { label: "LinkedIn", tone: cfg(hasLinkedInConfig()), detail: hasLinkedInConfig() ? "configurado" : "sin env vars" },
  ];

  // Estado general: solo lo crítico (base de datos). Integraciones/IA sin
  // configurar no es "caído", es informativo.
  const critical = dbChecks;
  const allOk = critical.every((c) => c.tone === "ok");
  const anyBad = critical.some((c) => c.tone === "bad");
  const overall = anyBad ? "bad" : allOk ? "ok" : "off";

  const env = process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown";
  const commit = (process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7);
  const checkedAt = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Estado del sistema</h1>
              <p className="mt-1 text-sm text-muted-foreground">LOCA · monitoreo en vivo</p>
            </div>
            <span
              className={
                "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold " +
                (overall === "ok"
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800"
                  : overall === "bad"
                    ? "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-950/60 dark:text-red-300 dark:ring-red-800"
                    : "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800")
              }
            >
              <Dot tone={overall} />
              {overall === "ok" ? "Operativo" : overall === "bad" ? "Con problemas" : "Parcial"}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-faint">
            <span>Entorno: <span className="text-muted-foreground">{env}</span></span>
            {commit && <span>Commit: <span className="font-mono text-muted-foreground">{commit}</span></span>}
            <span>Chequeado: <span className="text-muted-foreground">{checkedAt}</span></span>
          </div>
        </div>

        <Section title="Base de datos" checks={dbChecks} />
        <Section title="Integraciones sociales" checks={integrationChecks} />
        <Section title="Inteligencia artificial" checks={aiChecks} />

        <p className="text-center text-xs text-faint">
          Esta página se recalcula en cada carga. Para alertas por mail, apuntá un monitor a{" "}
          <span className="font-mono">/api/health</span>.
        </p>
      </div>
    </div>
  );
}
