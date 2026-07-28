-- ─────────────────────────────────────────────────────────────
-- LOCA MVP — migración 0005: log de uso de IA (tokens/costo)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Telemetría interna: cuánto consume cada negocio en cada llamada a IA
-- (texto o imagen). No es un dato que el dueño del negocio vea hoy —
-- es insumo para un futuro dashboard de consumo. Costo estimado con
-- tarifas estáticas (ver src/lib/ai/pricing.ts), no billing-grade.
-- ─────────────────────────────────────────────────────────────

create table public.ai_usage_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  business_id text,
  agent text not null,
  provider text not null,
  model text,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cost_usd numeric(10, 6) not null default 0,
  created_at timestamptz not null default now()
);

create index ai_usage_log_business_idx on public.ai_usage_log (business_id, created_at desc);

-- RLS habilitado SIN policies: el cliente (anon key) no puede leer ni
-- escribir esta tabla. Solo se inserta desde el servidor con service role
-- (mismo criterio que meta_connections y special_dates_catalog).
alter table public.ai_usage_log enable row level security;
