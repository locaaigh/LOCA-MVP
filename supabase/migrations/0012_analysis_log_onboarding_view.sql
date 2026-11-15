-- ─────────────────────────────────────────────────────────────
-- LOCA MVP — migración 0012: el log de análisis mide el onboarding REAL
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Los contadores ✓/~/⚠/✗ del log miden los campos del ANALIZADOR (una vista
-- agregada: "audience" y "goals" son un solo campo ahí). Pero el onboarding
-- pide los campos del REGISTRO (36, con audience/goals desglosados), así que
-- "no pudo completar: 3" no coincidía con lo que se le pedía al usuario.
-- Estas columnas guardan la vista del registro: cuántos obligatorios del
-- onboarding quedaron faltando tras el análisis, y cuáles.
-- ─────────────────────────────────────────────────────────────

alter table public.website_analysis_log
  add column if not exists onboarding_required_total int,
  add column if not exists onboarding_required_missing int,
  add column if not exists onboarding_missing jsonb;  -- [{id, label}, ...]
