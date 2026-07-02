-- ─────────────────────────────────────────────────────────────
-- LOCA MVP — esquema inicial
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ─────────────────────────────────────────────────────────────

-- Los IDs son los generados por la app (ej. "biz_abc123"), por eso text.
-- Los datos completos van en JSONB para no duplicar el modelo TypeScript.

create table if not exists public.businesses (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists businesses_user_idx on public.businesses (user_id);

create table if not exists public.strategies (
  business_id text primary key references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists strategies_user_idx on public.strategies (user_id);

create table if not exists public.calendar_items (
  id text primary key,
  business_id text not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists calendar_items_business_idx on public.calendar_items (business_id);
create index if not exists calendar_items_user_idx on public.calendar_items (user_id);

create table if not exists public.contents (
  id text primary key,
  business_id text not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  -- Campos de imagen en columnas propias: los escribe SOLO el servidor
  -- al generar la imagen, así un sync con datos viejos no los pisa.
  image_url text,
  image_status text,
  image_error text,
  updated_at timestamptz not null default now()
);
create index if not exists contents_business_idx on public.contents (business_id);
create index if not exists contents_user_idx on public.contents (user_id);

-- ── RLS: cada usuario solo ve/edita sus filas ────────────────
alter table public.businesses enable row level security;
alter table public.strategies enable row level security;
alter table public.calendar_items enable row level security;
alter table public.contents enable row level security;

drop policy if exists "own businesses" on public.businesses;
create policy "own businesses" on public.businesses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own strategies" on public.strategies;
create policy "own strategies" on public.strategies
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own calendar_items" on public.calendar_items;
create policy "own calendar_items" on public.calendar_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own contents" on public.contents;
create policy "own contents" on public.contents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Storage: bucket público para imágenes generadas ──────────
insert into storage.buckets (id, name, public)
values ('content-images', 'content-images', true)
on conflict (id) do nothing;

-- Lectura pública de las imágenes (el bucket es público, pero la
-- política explícita permite listar/leer vía API con anon key).
drop policy if exists "public read content images" on storage.objects;
create policy "public read content images" on storage.objects
  for select using (bucket_id = 'content-images');
