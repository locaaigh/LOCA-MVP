// ─────────────────────────────────────────────────────────────
// Catálogo de eventos de producto (compartido client/server).
// Un solo lugar para nombres → evita typos y drift entre PostHog
// y la tabla events de Supabase. Ver docs/ANALYTICS-PLAN.md.
//
// Convención de nombres: snake_case, sustantivo_verbo-en-pasado.
// ─────────────────────────────────────────────────────────────

/** Eventos que emite SOLO el servidor (rutas API). */
export const SERVER_EVENTS = [
  "strategy_generation_started",
  "strategy_generation_completed",
  "strategy_generation_failed",
  "strategy_feedback_applied",
  "content_generated",
  "content_feedback_applied",
  "image_generated",
  "image_generation_failed",
  "meta_connected",
  "meta_disconnected",
  "meta_deauthorized",
  "instagram_connected",
  "instagram_disconnected",
  "instagram_deauthorized",
  "content_published",
  "content_publish_failed",
  "website_extracted",
  "contact_lead_submitted",
  "business_deleted",
  "content_deleted",
] as const;

/**
 * Eventos client-side que ADEMÁS de PostHog se espejan en la tabla
 * events de Supabase (KPIs de negocio, consultables en SQL).
 */
export const MIRRORED_CLIENT_EVENTS = [
  "onboarding_started",
  "onboarding_step_completed",
  "onboarding_completed",
  "signup_completed",
  "login_completed",
  "demo_started",
  "strategy_approved",
  "content_approved",
  "content_approved_all",
  "content_rejected",
  "content_visual_change_requested",
  "content_reopened",
  "content_exported",
] as const;

/** Eventos client-side que van solo a PostHog (comportamiento fino). */
export const CLIENT_ONLY_EVENTS = [
  "onboarding_method_selected",
  "onboarding_web_analyzed",
  "onboarding_md_imported",
  "onboarding_step_viewed",
  "onboarding_validation_failed",
  "onboarding_pending_answered",
  "onboarding_eva_suggested",
  "onboarding_signup_modal_shown",
  "onboarding_section_edited",
  "demo_exited",
  "strategy_section_feedback",
  "strategy_exported",
  "content_batch_started",
  "content_copy_feedback",
  "content_manual_edited",
  "content_copied",
  "content_publish_clicked",
  "meta_connect_clicked",
  "instagram_connect_clicked",
  "ads_generated",
  "calendar_item_clicked",
  "cta_clicked",
] as const;

export type ServerEventName = (typeof SERVER_EVENTS)[number];
export type MirroredClientEventName = (typeof MIRRORED_CLIENT_EVENTS)[number];
export type ClientEventName = MirroredClientEventName | (typeof CLIENT_ONLY_EVENTS)[number];
/** Todo lo que puede aparecer en la tabla events. */
export type EventName = ServerEventName | MirroredClientEventName;

export function isMirroredClientEvent(name: string): name is MirroredClientEventName {
  return (MIRRORED_CLIENT_EVENTS as readonly string[]).includes(name);
}
