-- ─────────────────────────────────────────────────────────────
-- LOCA MVP — migración 0010: orden y textos editables por campo (Fase 3)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Extiende onboarding_field_config para que los admins también puedan
-- editar, por campo del onboarding: el ORDEN en que se pide (sort_order)
-- y sus TEXTOS (label, ayuda "por qué" y placeholder). Todo nullable:
-- null = se usa el default de código. La lógica (get/apply/isMissing)
-- sigue viviendo en código.
-- ─────────────────────────────────────────────────────────────

alter table public.onboarding_field_config
  add column if not exists sort_order int,
  add column if not exists label text,
  add column if not exists placeholder text,
  add column if not exists why text;
