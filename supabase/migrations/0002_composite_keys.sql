-- ─────────────────────────────────────────────────────────────
-- LOCA MVP — migración 0002: claves compuestas por usuario
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Por qué: los IDs de la app (ej. el negocio demo "biz_cafe_bruma")
-- se repiten entre usuarios. Con PK global un usuario podía "robar"
-- la fila de otro. Ahora la clave es (user_id, id): cada usuario
-- tiene su propio espacio de IDs, totalmente aislado.
-- ─────────────────────────────────────────────────────────────

drop table if exists public.contents;
drop table if exists public.calendar_items;
drop table if exists public.strategies;
drop table if exists public.businesses;

create table public.businesses (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.strategies (
  business_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, business_id),
  foreign key (user_id, business_id)
    references public.businesses (user_id, id) on delete cascade
);

create table public.calendar_items (
  id text not null,
  business_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, business_id)
    references public.businesses (user_id, id) on delete cascade
);
create index calendar_items_business_idx on public.calendar_items (user_id, business_id);

create table public.contents (
  id text not null,
  business_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  -- Columnas de imagen: las escribe SOLO el servidor al generar,
  -- así un sync con datos viejos no las pisa.
  image_url text,
  image_status text,
  image_error text,
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, business_id)
    references public.businesses (user_id, id) on delete cascade
);
create index contents_business_idx on public.contents (user_id, business_id);

-- ── RLS: cada usuario solo ve/edita sus filas ────────────────
alter table public.businesses enable row level security;
alter table public.strategies enable row level security;
alter table public.calendar_items enable row level security;
alter table public.contents enable row level security;

create policy "own businesses" on public.businesses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own strategies" on public.strategies
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own calendar_items" on public.calendar_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own contents" on public.contents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
