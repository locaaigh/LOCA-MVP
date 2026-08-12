"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { UTM_KEYS, getFirstTouchUtm } from "@/lib/analytics";

const APP_ORIGIN_RAW = process.env.NEXT_PUBLIC_APP_ORIGIN;

/**
 * Reenvía los params de campaña al cruzar heyloca.ai → app.heyloca.ai.
 *
 * Por qué hace falta: los links a la plataforma los arma `appHref()`
 * (lib/marketing/config), que se evalúa en el servidor y no puede conocer el
 * querystring del visitante. Y el store first-touch de lib/analytics vive en
 * localStorage, que es por origen: no cruza al subdominio. Sin esto, un signup
 * que entró por una campaña llega a la plataforma sin rastro de ella.
 *
 * Alcance: esto es solo para el store propio (`loca-utm`). La identidad de
 * PostHog y sus `$initial_utm_*` cruzan solos, porque su cookie se setea a
 * nivel dominio raíz (`cross_subdomain_cookie` viene en true).
 *
 * Los href se decoran DESPUÉS de montar, no durante el render, para no
 * introducir un mismatch de hidratación. Se rehace en cada cambio de ruta.
 */
export function AppLinkUtms() {
  const pathname = usePathname();

  useEffect(() => {
    // Sin la env el split está apagado y los links son relativos: nada que hacer.
    if (!APP_ORIGIN_RAW) return;

    let appOrigin: string;
    try {
      appOrigin = new URL(APP_ORIGIN_RAW).origin;
    } catch {
      return;
    }
    // Ya estamos en el subdominio de la app: no hay cruce que decorar.
    if (window.location.origin === appOrigin) return;

    const carry = campaignParams();
    if (!carry) return;

    document.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((anchor) => {
      let url: URL;
      try {
        url = new URL(anchor.href);
      } catch {
        return;
      }
      if (url.origin !== appOrigin) return;

      let changed = false;
      carry.forEach((value, key) => {
        // No pisar un param que el link ya trae explícito.
        if (url.searchParams.has(key)) return;
        url.searchParams.set(key, value);
        changed = true;
      });
      if (changed) anchor.href = url.toString();
    });
  }, [pathname]);

  return null;
}

/** Params de campaña de la URL actual, con fallback a la primera visita. */
function campaignParams(): URLSearchParams | null {
  const out = new URLSearchParams();
  let found = false;

  const current = new URLSearchParams(window.location.search);
  for (const key of UTM_KEYS) {
    const value = current.get(key);
    if (value) {
      out.set(key, value);
      found = true;
    }
  }

  if (!found) {
    // Navegó por el sitio y ya perdió el querystring de entrada.
    const stored = getFirstTouchUtm();
    for (const key of UTM_KEYS) {
      const value = stored?.[key];
      if (value) {
        out.set(key, value);
        found = true;
      }
    }
  }

  return found ? out : null;
}
