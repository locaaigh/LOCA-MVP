-- ─────────────────────────────────────────────────────────────
-- LOCA MVP — migración 0013: el log registra lo que el usuario completó a mano
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Cierra el funnel del análisis: al terminar el onboarding, la app marca en
-- la fila del log (matcheada por business_id) qué campos obligatorios que la
-- IA no pudo completar terminó completando el usuario a mano. En el detalle
-- del backoffice esos campos aparecen como "Completada a mano".
-- ─────────────────────────────────────────────────────────────

alter table public.website_analysis_log
  add column if not exists user_completed jsonb,          -- [{id, label}, ...]
  add column if not exists user_completed_at timestamptz;
