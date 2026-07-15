-- ─────────────────────────────────────────────────────────────
-- LOCA MVP — migración 0003: conexiones Meta (Instagram/Facebook)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Guarda los tokens OAuth de Meta por (user_id, business_id).
-- Los tokens van CIFRADOS en la capa de aplicación (AES-256-GCM
-- con META_TOKEN_ENCRYPTION_KEY); acá solo se persisten strings.
-- ─────────────────────────────────────────────────────────────

create table public.meta_connections (
  user_id uuid not null references auth.users (id) on delete cascade,
  business_id text not null,

  -- Identidad en Meta
  meta_user_id text not null,
  page_id text,
  page_name text,
  ig_user_id text,
  ig_username text,

  -- Tokens cifrados en app layer (nunca en texto plano)
  user_access_token_enc text not null,
  page_access_token_enc text,

  -- El user token long-lived dura ~60 días; el cron lo renueva antes.
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  status text not null default 'active'
    check (status in ('active', 'revoked', 'error')),

  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (user_id, business_id),
  foreign key (user_id, business_id)
    references public.businesses (user_id, id) on delete cascade
);

-- Para revocar por webhook de desautorización (llega solo el meta_user_id).
create index meta_connections_meta_user_idx on public.meta_connections (meta_user_id);

-- RLS habilitado SIN policies: el cliente (anon key) no puede leer ni
-- escribir esta tabla. Todo acceso pasa por el servidor con service role,
-- que nunca expone los tokens al frontend.
alter table public.meta_connections enable row level security;
