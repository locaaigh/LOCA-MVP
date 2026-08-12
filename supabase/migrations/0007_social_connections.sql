-- ─────────────────────────────────────────────────────────────
-- LOCA MVP — migración 0007: conexiones multi-proveedor
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- meta_connections nació atada a Facebook: PK (user_id, business_id),
-- o sea UNA conexión por negocio, y nombres de columna específicos de
-- Meta. Para sumar Instagram Login y LinkedIn hace falta:
--   1. Un negocio con varias conexiones, una por proveedor.
--   2. Nombres genéricos (LinkedIn no tiene "page").
--   3. refresh_token: LinkedIn lo usa, Meta no.
--
-- ⚠️ ORDEN: correr esta migración ANTES de deployar el código que la
-- usa. Al ampliar la PK, el upsert viejo (onConflict user_id,business_id)
-- deja de encontrar su constraint y falla.
--
-- No destruye datos: las filas existentes quedan como provider='facebook'
-- por el default, que es lo que semánticamente son.
-- ─────────────────────────────────────────────────────────────

alter table public.meta_connections rename to social_connections;

-- Nombres genéricos. account_* es la cuenta destino donde se publica:
-- página de Facebook, cuenta de Instagram, u organización de LinkedIn.
alter table public.social_connections rename column meta_user_id to provider_user_id;
alter table public.social_connections rename column page_id      to account_id;
alter table public.social_connections rename column page_name    to account_name;

alter table public.social_connections
  add column provider text not null default 'facebook'
    check (provider in ('facebook', 'instagram', 'linkedin')),
  -- LinkedIn devuelve refresh_token (~365 días) junto al access token.
  -- Meta e Instagram no: se renuevan intercambiando el token vigente.
  add column refresh_token_enc text;

-- Una conexión por (negocio, proveedor) en vez de una por negocio.
alter table public.social_connections drop constraint meta_connections_pkey;
alter table public.social_connections add primary key (user_id, business_id, provider);

-- Lo usa el webhook de deauthorize, que llega con el id del usuario en la
-- plataforma y sin saber de qué negocio se trata.
drop index if exists meta_connections_meta_user_idx;
create index social_connections_provider_user_idx
  on public.social_connections (provider, provider_user_id);

-- RLS ya venía habilitado y sin policies (solo service role); el rename
-- lo conserva. Los tokens nunca se exponen al cliente.
