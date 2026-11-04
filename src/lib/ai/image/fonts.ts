// ─────────────────────────────────────────────────────────────
// Fuentes para el overlay (Satori acepta TTF/OTF/WOFF, no WOFF2).
// Orden: archivo propio del brand kit (fileUrl) → Google Fonts por nombre
// (sin User-Agent devuelve TTF; verificado 25-10-2026) → fuente del tratamiento.
// Cache en memoria por familia+peso (dura lo que dura la instancia).
// ─────────────────────────────────────────────────────────────

export interface LoadedFont {
  name: string;
  data: ArrayBuffer;
  weight: number;
  style: "normal";
}

const cache = new Map<string, Promise<LoadedFont | null>>();

async function fetchArrayBuffer(url: string, timeoutMs = 8000): Promise<ArrayBuffer | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function loadGoogleFont(family: string, weight: number): Promise<LoadedFont | null> {
  const fam = family.trim();
  if (!fam) return null;
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fam).replace(/%20/g, "+")}:wght@${weight}&display=swap`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    // Sin User-Agent, Google Fonts devuelve src: url(...ttf).
    const res = await fetch(cssUrl, { signal: ctrl.signal });
    if (!res.ok) return null;
    const css = await res.text();
    const m = css.match(/url\(([^)]+\.(?:ttf|otf|woff))\)/i);
    if (!m) return null;
    const data = await fetchArrayBuffer(m[1]);
    if (!data) return null;
    return { name: fam, data, weight, style: "normal" };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function loadFontFile(url: string, name: string, weight: number): Promise<LoadedFont | null> {
  if (!/\.(ttf|otf|woff)(\?|$)/i.test(url)) return null; // woff2 no sirve para Satori
  const data = await fetchArrayBuffer(url);
  return data ? { name, data, weight, style: "normal" } : null;
}

export async function loadFont(params: { family?: string; fileUrl?: string; weight: number }): Promise<LoadedFont | null> {
  const key = `${params.fileUrl || params.family || ""}|${params.weight}`;
  if (!key.startsWith("|")) {
    const hit = cache.get(key);
    if (hit) return hit;
    const p = (async () => {
      if (params.fileUrl) {
        const f = await loadFontFile(params.fileUrl, params.family || "BrandFont", params.weight);
        if (f) return f;
      }
      if (params.family) return loadGoogleFont(params.family, params.weight);
      return null;
    })();
    cache.set(key, p);
    return p;
  }
  return null;
}

/** Carga la fuente de marca con fallback a la del tratamiento y, por último, Inter. */
export async function resolveOverlayFont(params: {
  brandFamily?: string;
  brandFileUrl?: string;
  fallbackFamily: string;
  weight: number;
}): Promise<LoadedFont> {
  const brand = await loadFont({ family: params.brandFamily, fileUrl: params.brandFileUrl, weight: params.weight });
  if (brand) return brand;
  const treatment = await loadFont({ family: params.fallbackFamily, weight: params.weight });
  if (treatment) return treatment;
  const inter = await loadFont({ family: "Inter", weight: 700 });
  if (inter) return inter;
  throw new Error("No se pudo cargar ninguna fuente para el overlay (sin acceso a Google Fonts).");
}
