-- ─────────────────────────────────────────────────────────────
-- LOCA MVP — migración 0011: log de análisis de Eva (calidad)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Registro de CADA análisis que Eva hace sobre una web (/api/extract) o
-- sobre un import de texto (.md de otra IA), independientemente de si ese
-- onboarding se concretó como negocio: qué modelo se usó, qué campos pudo
-- completar y cuáles no, con el snapshot completo para auditar calidad
-- desde el backoffice (/admin/web-analysis).
-- ─────────────────────────────────────────────────────────────

create table public.website_analysis_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  source text not null check (source in ('website', 'external_md')),
  url text,                               -- null en imports .md
  file_name text,                         -- nombre del .md importado, si aplica
  business_id text,                       -- id provisorio del onboarding (anónimo casi siempre)
  provider text,                          -- 'anthropic' | 'mock' | 'client' (md parseado local)
  model text,                             -- ej: claude-opus-5-5 (+vision si corrió plan B)
  success boolean not null default false, -- false = cayó a mock / no se pudo leer
  mode text,                              -- 'ai' | 'basic'
  confidence numeric,
  duration_ms int,
  usage jsonb,                            -- tokens y costo estimado
  warning text,
  fields_found int not null default 0,
  fields_suggested int not null default 0,
  fields_review int not null default 0,
  fields_missing int not null default 0,
  field_statuses jsonb,                   -- por campo: status/confidence/source
  found_fields jsonb                      -- snapshot de lo que Eva generó
);

create index website_analysis_log_created_idx
  on public.website_analysis_log (created_at desc);

-- RLS habilitado SIN policies: ni el anon key ni usuarios leen/escriben esta
-- tabla directo. Escribe el servidor (service role) y se lee desde las rutas
-- /api/admin — mismo criterio que special_dates_catalog.
alter table public.website_analysis_log enable row level security;
