"use client";
// ─────────────────────────────────────────────────────────────
// Analytics client-side (PostHog + espejo first-party).
// - track() manda todo a PostHog; los eventos de negocio
//   (MIRRORED_CLIENT_EVENTS) se espejan además en la tabla events
//   de Supabase vía POST /api/events (funciona aunque no haya key
//   de PostHog configurada).
// - Sin NEXT_PUBLIC_POSTHOG_KEY todo PostHog es no-op silencioso.
// Ver docs/ANALYTICS-PLAN.md.
// ─────────────────────────────────────────────────────────────
import posthog from "posthog-js";
import { isMirroredClientEvent, type ClientEventName } from "@/lib/analytics-events";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
const UTM_STORAGE_KEY = "loca-utm";
const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
] as const;

let initialized = false;

export function analyticsEnabled(): boolean {
  return typeof window !== "undefined" && !!KEY;
}

export function initAnalytics(): void {
  if (!analyticsEnabled() || initialized) return;
  initialized = true;
  posthog.init(KEY as string, {
    api_host: HOST,
    // Pageviews manuales (App Router los captura AnalyticsProvider).
    capture_pageview: false,
    // Pageleave = tiempo por página.
    capture_pageleave: true,
    // Autocapture de clicks: los CTAs de marketing se identifican con
    // data-ph-capture-attribute-cta="..." sin instrumentar cada botón.
    autocapture: true,
    session_recording: { maskAllInputs: true },
    persistence: "localStorage+cookie",
  });
  captureFirstTouchUtm();
}

/**
 * Evento de producto. Los del catálogo espejado van también a la tabla
 * events (best-effort, keepalive para no perder eventos al navegar).
 */
export function track(
  name: ClientEventName,
  props: Record<string, unknown> = {},
  opts?: { businessId?: string }
): void {
  if (typeof window === "undefined") return;
  if (analyticsEnabled()) posthog.capture(name, props);
  // Conversiones estándar al Meta Pixel (si está cargado): permiten
  // optimizar campañas por registro/lead sin tocar nada más.
  if (window.fbq) {
    if (name === "signup_completed") window.fbq("track", "CompleteRegistration");
    if (name === "onboarding_started") window.fbq("track", "StartTrial");
  }
  // Conversión de Google Ads: send_to = "AW-XXXX/label" de la acción de
  // conversión creada en Google Ads (env NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL).
  const gadsSignup = process.env.NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL;
  if (window.gtag && gadsSignup && name === "signup_completed") {
    window.gtag("event", "conversion", { send_to: gadsSignup });
  }
  if (isMirroredClientEvent(name)) {
    try {
      fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, businessId: opts?.businessId, props }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* telemetría nunca rompe la UX */
    }
  }
}

/** Liga la sesión de PostHog al usuario real (login/signup). */
export function identifyUser(user: {
  id: string;
  email?: string;
  name?: string;
  isDemo?: boolean;
}): void {
  if (!analyticsEnabled()) return;
  if (user.isDemo) {
    markDemoSession(true);
    return;
  }
  // UTMs first-touch como $set_once: quedan pegadas a la persona y
  // permiten atribuir el signup a la campaña de origen.
  posthog.identify(
    user.id,
    { email: user.email, name: user.name },
    getFirstTouchUtm() ?? undefined
  );
}

/** Logout / cambio de cuenta: nueva identidad anónima. */
export function resetAnalytics(): void {
  if (!analyticsEnabled() || !initialized) return;
  posthog.reset();
}

/** Marca (o desmarca) la sesión como demo para excluirla de métricas. */
export function markDemoSession(on: boolean): void {
  if (!analyticsEnabled()) return;
  if (on) posthog.register({ is_demo: true });
  else posthog.unregister("is_demo");
}

/**
 * Guarda UTMs + referrer de la primera visita en localStorage.
 * First-touch: no se pisa en visitas posteriores. Sobrevive al salto
 * heyloca.ai → app.heyloca.ai solo si comparten dominio; para el split
 * real de dominios ver el plan (los links al app llevan las UTMs).
 */
export function captureFirstTouchUtm(): void {
  try {
    if (localStorage.getItem(UTM_STORAGE_KEY)) return;
    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    for (const k of UTM_KEYS) {
      const v = params.get(k);
      if (v) utm[k] = v;
    }
    if (document.referrer && !document.referrer.includes(window.location.host)) {
      utm.initial_referrer = document.referrer;
    }
    if (Object.keys(utm).length > 0) {
      utm.captured_at = new Date().toISOString();
      localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm));
    }
  } catch {
    /* storage bloqueado: seguimos sin UTMs */
  }
}

export function getFirstTouchUtm(): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(UTM_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : null;
  } catch {
    return null;
  }
}
