"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { analyticsEnabled, initAnalytics } from "@/lib/analytics";

// Init en import (client-only): PostHog queda listo antes del primer render.
if (typeof window !== "undefined") {
  initAnalytics();
}

// ── Meta Pixel (opcional, env-gated) ─────────────────────────
// Sin NEXT_PUBLIC_META_PIXEL_ID no se carga nada. Sirve para construir
// audiencias desde el tráfico orgánico y medir conversiones cuando corran
// ads. El fbq de PageView por ruta lo dispara PageviewTracker.
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function initMetaPixel(): void {
  if (!PIXEL_ID || typeof window === "undefined" || window.fbq) return;
  const fbq: any = (...args: unknown[]) => {
    if (fbq.callMethod) fbq.callMethod.apply(fbq, args);
    else fbq.queue.push(args);
  };
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  window.fbq = fbq;
  window._fbq = fbq;
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
  fbq("init", PIXEL_ID);
}

// ── Google tag / Google Ads (opcional, env-gated) ─────────────
// Sin NEXT_PUBLIC_GOOGLE_ADS_ID (formato AW-XXXXXXXXX) no se carga nada.
// Directo con gtag.js, sin Tag Manager: menos peso y todo versionado acá.
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;

function initGoogleTag(): void {
  if (!GOOGLE_ADS_ID || typeof window === "undefined" || window.gtag) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`;
  document.head.appendChild(script);
  window.gtag("js", new Date());
  window.gtag("config", GOOGLE_ADS_ID);
}

if (typeof window !== "undefined") {
  initMetaPixel();
  initGoogleTag();
}

function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    // $pageview manual en cada cambio de ruta del App Router; PostHog
    // toma la URL actual solo. capture_pageleave mide el tiempo por página.
    if (analyticsEnabled()) posthog.capture("$pageview");
    if (PIXEL_ID) window.fbq?.("track", "PageView");
    if (GOOGLE_ADS_ID) window.gtag?.("event", "page_view");
  }, [pathname, searchParams]);

  return null;
}

/** No renderiza nada: inicializa PostHog (+ Meta Pixel) y captura pageviews. */
export function AnalyticsProvider() {
  return (
    // useSearchParams exige Suspense en el App Router.
    <Suspense fallback={null}>
      <PageviewTracker />
    </Suspense>
  );
}
