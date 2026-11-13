-- ─────────────────────────────────────────────────────────────
-- LOCA MVP — migración 0009: backoffice de admins
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- 1) admin_users: quiénes son admins de la plataforma. El rol vive en la
--    base (no en una env var) para que las policies de RLS puedan chequearlo.
-- 2) onboarding_field_config: overrides de obligatoriedad/criticidad de los
--    campos del onboarding, editables desde /admin sin redeploy. Los defaults
--    viven en código (business-questions.ts); acá solo las excepciones.
--    Tabla vacía o Supabase caído ⇒ la app usa los defaults, nada se rompe.
-- ─────────────────────────────────────────────────────────────

create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- Cada usuario puede ver SOLO su propia fila: lo justo para que la app
-- verifique "¿soy admin?" y para que las policies de otras tablas hagan el
-- exists() sin recursión. Nadie puede listar a los demás admins ni escribir
-- (altas por SQL manual, criterio del MVP).
create policy admin_users_self_read on public.admin_users
  for select using (user_id = auth.uid());

-- Alta de los admins iniciales (requiere que ya tengan cuenta creada en la app).
-- IMPORTANTE: reemplazar/agregar el email real de Sebi antes de ejecutar.
insert into public.admin_users (user_id, email)
select id, email from auth.users
where email in (
  'dev@infinidad.com.ar'   -- Alan
  -- , 'sebi@...'          -- Sebi: completar con su email de la app
);

-- ── Config de campos del onboarding ──────────────────────────
-- Una fila por campo CON override; required/critical son los valores
-- EFECTIVOS (no nulos). "Restaurar default" = borrar la fila.
create table public.onboarding_field_config (
  field_id text primary key,              -- id de BusinessQuestion (ej: 'values')
  required boolean not null,
  critical boolean not null,
  updated_by uuid references auth.users (id) on delete set null,
  updated_by_email text,
  updated_at timestamptz not null default now(),
  -- Invariante de producto: un campo crítico (bloquea la estrategia) no puede
  -- ser opcional en el onboarding — terminarías el alta sin un dato que
  -- después te bloquea. La app también lo valida; esto es el cinturón.
  constraint critical_implies_required check (not critical or required)
);

alter table public.onboarding_field_config enable row level security;

-- Lectura pública: el onboarding corre anónimo (antes de crear cuenta) y la
-- config no es información sensible.
create policy field_config_public_read on public.onboarding_field_config
  for select using (true);

-- Escritura solo admins. Las rutas /api/admin escriben con el cliente de la
-- SESIÓN (no el service role), así esta policy es el candado final aunque
-- hubiera un bug en la capa de arriba.
create policy field_config_admin_write on public.onboarding_field_config
  for all
  using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));
