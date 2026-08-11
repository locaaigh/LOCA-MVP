-- ─────────────────────────────────────────────────────────────
-- LOCA MVP — migración 0006: analytics first-party
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Tres piezas (ver docs/ANALYTICS-PLAN.md):
--   1. events      — eventos de producto (aprobaciones, publicaciones,
--                    signup, onboarding). Fuente de verdad SQL de los KPIs,
--                    independiente de PostHog.
--   2. leads       — leads del form de /contacto (hoy solo viven en logs).
--   3. ai_usage_log — columnas nuevas: latencia, éxito y fallback a mock
--                    (hoy las llamadas que caen a mock son invisibles).
-- ─────────────────────────────────────────────────────────────

-- 1. Eventos de producto
create table public.events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  business_id text,
  name text not null,
  props jsonb not null default '{}',
  -- false = tráfico demo / header x-loca-user-id sin verificar.
  -- Filtrar con is_authenticated = true para métricas reales.
  is_authenticated boolean not null default true,
  created_at timestamptz not null default now()
);

create index events_name_idx on public.events (name, created_at desc);
create index events_user_idx on public.events (user_id, created_at desc);
create index events_business_idx on public.events (business_id, created_at desc);

-- RLS habilitado SIN policies: solo escribe/lee el servidor con service role
-- (mismo criterio que ai_usage_log y meta_connections).
alter table public.events enable row level security;

-- 2. Leads de /contacto
create table public.leads (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null,
  company text,
  volume text,
  message text,
  source text not null default 'contact_form',
  created_at timestamptz not null default now()
);

alter table public.leads enable row level security;

-- 3. ai_usage_log: latencia, éxito y detección de mock
alter table public.ai_usage_log
  add column duration_ms int,
  add column success boolean not null default true,
  add column is_mock boolean not null default false;
