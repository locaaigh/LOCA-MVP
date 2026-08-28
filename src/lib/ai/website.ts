// ─────────────────────────────────────────────────────────────
// Lectura y extracción server-side de la web del negocio.
// Sin dependencias: fetch + parsing por regex. Límites estrictos.
// Lo determinístico (colores, fuentes, redes, contacto) se marca como
// "detected/found". Lo inferido lo decide la IA (o heurística) como
// "suggested/review". Nunca inventamos datos como seguros.
// ─────────────────────────────────────────────────────────────
import type {
  BrandColor,
  BrandKit,
  BusinessIntelligence,
  Confidence,
  FieldStatus,
  WebsiteAnalysis,
  WebsiteFoundFields,
} from "../types";

export interface RawWebContent {
  url: string;
  pagesRead: string[];
  title: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  favicon: string;
  headings: string[];
  paragraphs: string[];
  buttons: string[];
  navTexts: string[];
  internalLinks: string[];
  externalLinks: string[];
  socialLinks: { platform: string; url: string }[];
  emails: string[];
  phones: string[];
  whatsapp: string;
  images: string[];
  logoCandidates: string[];
  cssColors: string[];
  // Colores con señal fuerte de marca (theme-color, variables --brand/--primary).
  priorityColors: string[];
  fontFamilies: string[];
  googleFonts: string[];
  text: string; // texto plano agregado (limitado)
  // señales de conversión
  signals: {
    hasEcommerce: boolean;
    hasWhatsappSales: boolean;
    hasReservations: boolean;
    hasPhysicalStore: boolean;
    hasContactForm: boolean;
  };
  reachable: boolean;
}

const SOCIAL_PATTERNS: { platform: string; re: RegExp }[] = [
  { platform: "Instagram", re: /https?:\/\/(www\.)?instagram\.com\/[^\s"'<>)]+/i },
  { platform: "TikTok", re: /https?:\/\/(www\.)?tiktok\.com\/[^\s"'<>)]+/i },
  { platform: "Facebook", re: /https?:\/\/(www\.)?facebook\.com\/[^\s"'<>)]+/i },
  { platform: "LinkedIn", re: /https?:\/\/(www\.)?linkedin\.com\/[^\s"'<>)]+/i },
  { platform: "X", re: /https?:\/\/(www\.)?(twitter|x)\.com\/[^\s"'<>)]+/i },
  { platform: "YouTube", re: /https?:\/\/(www\.)?youtube\.com\/[^\s"'<>)]+/i },
  { platform: "Pinterest", re: /https?:\/\/(www\.)?pinterest\.[a-z.]+\/[^\s"'<>)]+/i },
  { platform: "WhatsApp", re: /https?:\/\/(wa\.me|api\.whatsapp\.com)\/[^\s"'<>)]+/i },
  { platform: "Google Business Profile", re: /https?:\/\/(g\.page|business\.google\.com)\/[^\s"'<>)]+/i },
];

const INTERNAL_PATHS = [
  "/about",
  "/nosotros",
  "/servicios",
  "/productos",
  "/menu",
  "/shop",
  "/tienda",
  "/contacto",
  "/reservas",
  "/pricing",
  "/planes",
];

function normalizeUrl(url: string): string {
  return url.startsWith("http") ? url : `https://${url}`;
}

async function fetchHtml(url: string, timeoutMs = 7000): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
      },
    });
    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (ct && !ct.includes("html") && !ct.includes("text") && !ct.includes("xml")) return null;
    const text = await res.text();
    return text.length > 200 ? text : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// Colores/fuentes reales viven casi siempre en hojas de estilo externas
// (Tailwind/Next.js/Webflow/Shopify/WordPress), nunca inline en el HTML.
async function fetchCss(url: string, timeoutMs = 4000): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/css,*/*;q=0.8",
      },
    });
    if (!res.ok) return null;
    const text = await res.text();
    // Cap: bundles minificados pueden ser gigantes, no hace falta escanear todo.
    return text.slice(0, 300_000);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function extractStylesheetLinks(html: string, baseUrl: string): string[] {
  const links = matchAll(
    html,
    /<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/i
  );
  const linksAltOrder = matchAll(
    html,
    /<link[^>]+href=["']([^"']+)["'][^>]*rel=["']stylesheet["']/i
  );
  return uniq([...links, ...linksAltOrder]).map((h) => absolute(baseUrl, h));
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchAll(html: string, re: RegExp): string[] {
  const out: string[] = [];
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  let m: RegExpExecArray | null;
  while ((m = g.exec(html)) !== null) {
    out.push(m[1] ?? m[0]);
    if (out.length > 200) break;
  }
  return out;
}

function uniq(arr: string[]): string[] {
  return Array.from(new Set(arr));
}

function extractTags(html: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  return matchAll(html, re).map((s) => htmlToText(s)).filter((s) => s && s.length < 200);
}

function metaContent(html: string, key: string, attr: "name" | "property"): string {
  const re = new RegExp(`<meta[^>]*${attr}=["']${key}["'][^>]*content=["']([^"']*)["']`, "i");
  const m = html.match(re);
  if (m) return m[1];
  const re2 = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*${attr}=["']${key}["']`, "i");
  return html.match(re2)?.[1] || "";
}

// ── Conversión de colores no-hex a hex ───────────────────────
// Muchos sitios definen los colores como rgb()/hsl()/oklch() (Tailwind v4
// usa oklch por defecto). Sin convertirlos, el color de marca real queda
// invisible para la heurística.
function toHex(r: number, g: number, b: number): string {
  const h = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

// OKLCH → sRGB (Björn Ottosson): oklch → oklab → LMS → sRGB lineal → gamma.
function oklchToRgb(L: number, C: number, H: number): [number, number, number] {
  const hr = (H * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  const gamma = (c: number) => {
    const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(0, c), 1 / 2.4) - 0.055;
    return v * 255;
  };
  return [gamma(lin[0]), gamma(lin[1]), gamma(lin[2])];
}

// Encuentra rgb()/hsl()/oklch() en un texto CSS y los devuelve como hex.
function extractFunctionalColors(text: string): string[] {
  const out: string[] = [];
  const toks = (inner: string) => inner.replace(/\//g, " ").split(/[\s,]+/).filter(Boolean);
  const n = (t: string) => parseFloat(t); // parseFloat ignora sufijos (%, deg)

  for (const inner of matchAll(text, /rgba?\(([^)]+)\)/i)) {
    const t = toks(inner);
    if (t.length < 3) continue;
    const conv = (tok: string) => (tok.includes("%") ? (n(tok) / 100) * 255 : n(tok));
    out.push(toHex(conv(t[0]), conv(t[1]), conv(t[2])));
  }
  for (const inner of matchAll(text, /hsla?\(([^)]+)\)/i)) {
    const t = toks(inner);
    if (t.length < 3) continue;
    out.push(toHex(...hslToRgb(n(t[0]), n(t[1]) / 100, n(t[2]) / 100)));
  }
  for (const inner of matchAll(text, /oklch\(([^)]+)\)/i)) {
    const t = toks(inner);
    if (t.length < 3) continue;
    const L = t[0].includes("%") ? n(t[0]) / 100 : n(t[0]);
    const C = t[1].includes("%") ? (n(t[1]) / 100) * 0.4 : n(t[1]);
    out.push(toHex(...oklchToRgb(L, C, n(t[2]))));
  }
  return out.filter((c) => /^#[0-9a-f]{6}$/i.test(c));
}

// Reutilizable tanto para el HTML (colores/fuentes inline o en <style>)
// como para el contenido de hojas de estilo externas ya fetcheadas.
// priorityColors = señales fuertes de marca (variables --brand/--primary/--accent),
// que pesan más que "el hex más saturado" a la hora de elegir el primario.
function extractColorsAndFonts(text: string): {
  cssColors: string[];
  priorityColors: string[];
  fontFamilies: string[];
  googleFonts: string[];
} {
  const cssColors = uniq([
    ...matchAll(text, /#[0-9a-fA-F]{6}\b/),
    ...matchAll(text, /#[0-9a-fA-F]{3}\b/),
    ...extractFunctionalColors(text),
  ]);
  // Valores de variables CSS con nombre de marca/primario/acento.
  const brandVarValues = matchAll(text, /--[\w-]*(?:brand|primary|accent)[\w-]*\s*:\s*([^;}\n]+)/i);
  const priorityColors = uniq(
    brandVarValues.flatMap((v) => [
      ...matchAll(v, /#[0-9a-fA-F]{6}\b/),
      ...matchAll(v, /#[0-9a-fA-F]{3}\b/),
      ...extractFunctionalColors(v),
    ])
  );
  const fontFamilies = uniq(
    matchAll(text, /font-family\s*:\s*([^;}"']+)/i).map((f) =>
      f.split(",")[0].replace(/['"]/g, "").trim()
    )
  ).filter((f) => f && !/^(inherit|initial|unset|var\()/i.test(f));
  const googleFonts = uniq(
    matchAll(text, /fonts\.googleapis\.com\/css2?\?[^"')]*family=([^"')&:]+)/i).map((f) =>
      decodeURIComponent(f).replace(/\+/g, " ")
    )
  );
  return { cssColors, priorityColors, fontFamilies, googleFonts };
}

function absolute(base: string, href: string): string {
  try {
    return new URL(href, base).href;
  } catch {
    return href;
  }
}

// Extrae el contenido crudo de una sola página HTML.
function parsePage(html: string, baseUrl: string): Partial<RawWebContent> {
  const origin = (() => {
    try {
      return new URL(baseUrl).origin;
    } catch {
      return "";
    }
  })();

  const hrefs = matchAll(html, /href=["']([^"']+)["']/i);
  const internalLinks: string[] = [];
  const externalLinks: string[] = [];
  for (const h of hrefs) {
    if (h.startsWith("#") || h.startsWith("mailto:") || h.startsWith("tel:")) continue;
    const abs = absolute(baseUrl, h);
    if (origin && abs.startsWith(origin)) internalLinks.push(abs);
    else if (abs.startsWith("http")) externalLinks.push(abs);
  }

  // redes sociales
  const socialLinks: { platform: string; url: string }[] = [];
  for (const { platform, re } of SOCIAL_PATTERNS) {
    const m = html.match(re);
    if (m) socialLinks.push({ platform, url: m[0] });
  }

  // contacto
  const emails = uniq(matchAll(html, /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/));
  const telLinks = matchAll(html, /tel:([+0-9()\s-]{6,})/i);
  const phones = uniq(telLinks.map((p) => p.trim()));
  const waMatch = html.match(/https?:\/\/wa\.me\/[0-9]+/i);
  const whatsapp = waMatch ? waMatch[0] : "";

  // colores y fuentes (inline/<style> en el HTML; las hojas externas se
  // fetchean y escanean aparte en fetchWebsite)
  const { cssColors: htmlColors, priorityColors: htmlPriority, fontFamilies, googleFonts } =
    extractColorsAndFonts(html);
  // theme-color / TileColor son señal fuerte del color de marca del sitio.
  const metaColors = [
    metaContent(html, "theme-color", "name"),
    metaContent(html, "msapplication-TileColor", "name"),
  ].filter((c) => /^#[0-9a-fA-F]{3,6}$/.test(c));
  const cssColors = uniq([...htmlColors, ...metaColors]);
  const priorityColors = uniq([...metaColors, ...htmlPriority]);

  // imágenes y logos
  const imgs = matchAll(html, /<img[^>]+src=["']([^"']+)["']/i).map((s) => absolute(baseUrl, s));
  const logoCandidates = matchAll(html, /<img[^>]+(?:class|alt|id|src)=["'][^"']*logo[^"']*["'][^>]*>/i)
    .map((tag) => tag.match(/src=["']([^"']+)["']/i)?.[1] || "")
    .filter(Boolean)
    .map((s) => absolute(baseUrl, s));

  const favicon =
    html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*href=["']([^"']+)["']/i)?.[1] || "";

  const text = htmlToText(html).slice(0, 4000);
  const lower = (html + " " + text).toLowerCase();

  return {
    title: extractTags(html, "title")[0] || "",
    metaDescription: metaContent(html, "description", "name"),
    ogTitle: metaContent(html, "og:title", "property"),
    ogDescription: metaContent(html, "og:description", "property"),
    ogImage: metaContent(html, "og:image", "property"),
    favicon: favicon ? absolute(baseUrl, favicon) : "",
    headings: uniq([...extractTags(html, "h1"), ...extractTags(html, "h2"), ...extractTags(html, "h3")]).slice(0, 30),
    paragraphs: extractTags(html, "p").filter((p) => p.length > 30).slice(0, 30),
    buttons: uniq([...extractTags(html, "button"), ...matchAll(html, /<a[^>]*class=["'][^"']*btn[^"']*["'][^>]*>([\s\S]*?)<\/a>/i).map(htmlToText)]).slice(0, 20),
    navTexts: extractTags(html, "nav").join(" ").split(/\s{2,}/).filter(Boolean).slice(0, 20),
    internalLinks: uniq(internalLinks),
    externalLinks: uniq(externalLinks),
    socialLinks,
    emails,
    phones,
    whatsapp,
    images: uniq(imgs).slice(0, 20),
    logoCandidates: uniq(logoCandidates).slice(0, 5),
    cssColors,
    priorityColors,
    fontFamilies,
    googleFonts,
    text,
    signals: {
      hasEcommerce: /(add to cart|agregar al carrito|comprar ahora|carrito|checkout|tienda|\/shop|catálogo|catalogo)/.test(lower),
      hasWhatsappSales: !!whatsapp || /wa\.me|whatsapp/.test(lower),
      hasReservations: /(reserva|reservar|booking|turnos|agendar)/.test(lower),
      hasPhysicalStore: /(dirección|direccion|sucursal|local|vení|veni|nos visitás|nos visitas|maps\.google|goo\.gl\/maps)/.test(lower),
      hasContactForm: /(<form|contacto|contactanos|contáctanos|enviar mensaje)/.test(lower),
    },
  };
}

function mergeRaw(base: RawWebContent, add: Partial<RawWebContent>): void {
  base.headings = uniq([...base.headings, ...(add.headings || [])]).slice(0, 60);
  base.paragraphs = uniq([...base.paragraphs, ...(add.paragraphs || [])]).slice(0, 60);
  base.buttons = uniq([...base.buttons, ...(add.buttons || [])]).slice(0, 40);
  base.internalLinks = uniq([...base.internalLinks, ...(add.internalLinks || [])]);
  base.externalLinks = uniq([...base.externalLinks, ...(add.externalLinks || [])]);
  base.emails = uniq([...base.emails, ...(add.emails || [])]);
  base.phones = uniq([...base.phones, ...(add.phones || [])]);
  base.images = uniq([...base.images, ...(add.images || [])]).slice(0, 40);
  base.logoCandidates = uniq([...base.logoCandidates, ...(add.logoCandidates || [])]).slice(0, 8);
  base.cssColors = uniq([...base.cssColors, ...(add.cssColors || [])]);
  base.priorityColors = uniq([...base.priorityColors, ...(add.priorityColors || [])]);
  base.fontFamilies = uniq([...base.fontFamilies, ...(add.fontFamilies || [])]);
  base.googleFonts = uniq([...base.googleFonts, ...(add.googleFonts || [])]);
  base.text = (base.text + " " + (add.text || "")).slice(0, 12000);
  if (!base.whatsapp && add.whatsapp) base.whatsapp = add.whatsapp;
  const seen = new Set(base.socialLinks.map((s) => s.platform));
  for (const s of add.socialLinks || []) if (!seen.has(s.platform)) base.socialLinks.push(s);
  if (add.signals) {
    base.signals.hasEcommerce ||= add.signals.hasEcommerce;
    base.signals.hasWhatsappSales ||= add.signals.hasWhatsappSales;
    base.signals.hasReservations ||= add.signals.hasReservations;
    base.signals.hasPhysicalStore ||= add.signals.hasPhysicalStore;
    base.signals.hasContactForm ||= add.signals.hasContactForm;
  }
}

// Lee la home + hasta 5 páginas internas comunes.
export async function fetchWebsite(url: string): Promise<RawWebContent> {
  const full = normalizeUrl(url);
  const base: RawWebContent = {
    url: full,
    pagesRead: [],
    title: "",
    metaDescription: "",
    ogTitle: "",
    ogDescription: "",
    ogImage: "",
    favicon: "",
    headings: [],
    paragraphs: [],
    buttons: [],
    navTexts: [],
    internalLinks: [],
    externalLinks: [],
    socialLinks: [],
    emails: [],
    phones: [],
    whatsapp: "",
    images: [],
    logoCandidates: [],
    cssColors: [],
    priorityColors: [],
    fontFamilies: [],
    googleFonts: [],
    text: "",
    signals: {
      hasEcommerce: false,
      hasWhatsappSales: false,
      hasReservations: false,
      hasPhysicalStore: false,
      hasContactForm: false,
    },
    reachable: false,
  };

  const homeHtml = await fetchHtml(full);
  if (!homeHtml) return base;

  base.reachable = true;
  const home = parsePage(homeHtml, full);
  Object.assign(base, {
    title: home.title,
    metaDescription: home.metaDescription,
    ogTitle: home.ogTitle,
    ogDescription: home.ogDescription,
    ogImage: home.ogImage,
    favicon: home.favicon,
    navTexts: home.navTexts || [],
  });
  mergeRaw(base, home);

  // Colores/fuentes reales viven casi siempre en hojas de estilo externas,
  // no inline en el HTML — fetchear hasta 6 (en paralelo) y escanearlas igual.
  const stylesheetUrls = extractStylesheetLinks(homeHtml, full).slice(0, 6);
  if (stylesheetUrls.length) {
    const cssTexts = (await Promise.all(stylesheetUrls.map((u) => fetchCss(u)))).filter(
      (t): t is string => !!t
    );
    if (cssTexts.length) {
      const fromCss = extractColorsAndFonts(cssTexts.join("\n"));
      base.cssColors = uniq([...base.cssColors, ...fromCss.cssColors]);
      base.priorityColors = uniq([...base.priorityColors, ...fromCss.priorityColors]);
      base.fontFamilies = uniq([...base.fontFamilies, ...fromCss.fontFamilies]);
      base.googleFonts = uniq([...base.googleFonts, ...fromCss.googleFonts]);
    }
  }

  // Descubrir hasta 5 páginas internas relevantes.
  let origin = "";
  try {
    origin = new URL(full).origin;
  } catch {
    /* noop */
  }
  const candidates = new Set<string>();
  // 1) links internos que matcheen rutas comunes
  for (const link of base.internalLinks) {
    const path = link.replace(origin, "").toLowerCase();
    if (INTERNAL_PATHS.some((p) => path.startsWith(p))) candidates.add(link);
  }
  // 2) rutas comunes fijas
  if (origin) for (const p of INTERNAL_PATHS) candidates.add(origin + p);

  let fetched = 0;
  for (const link of candidates) {
    if (fetched >= 5) break;
    if (link === full) continue;
    const html = await fetchHtml(link, 5000);
    if (html) {
      base.pagesRead.push(link);
      mergeRaw(base, parsePage(html, link));
      fetched++;
    }
  }
  base.pagesRead.unshift(full);
  return base;
}

// ─────────────────────────────────────────────────────────────
// Constructores de BrandKit / BusinessIntelligence (heurística)
// ─────────────────────────────────────────────────────────────
function norm6(hex: string): string {
  let h = hex.replace("#", "").toLowerCase();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return "#" + h;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = norm6(hex).slice(1);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function saturation(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const l = (max + min) / 2;
  return l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
}

export function buildBrandKitFromRaw(raw: RawWebContent): BrandKit {
  const colors = uniq(raw.cssColors.map(norm6)).filter((c) => /^#[0-9a-f]{6}$/.test(c));
  // Colores con señal fuerte de marca (theme-color / variables --brand/--primary).
  const priority = uniq((raw.priorityColors || []).map(norm6)).filter((c) => /^#[0-9a-f]{6}$/.test(c));
  // Un color "de marca" usable: ni casi blanco ni casi negro, con algo de color.
  const isBrandy = (c: string) => saturation(c) > 0.15 && luminance(c) > 0.08 && luminance(c) < 0.92;

  // saturados (candidatos a primario/acento) ordenados por saturación
  const saturated = colors
    .filter((c) => saturation(c) > 0.25 && luminance(c) > 0.08 && luminance(c) < 0.95)
    .sort((a, b) => saturation(b) - saturation(a));
  const lights = colors.filter((c) => luminance(c) >= 0.9).sort((a, b) => luminance(b) - luminance(a));
  const darks = colors.filter((c) => luminance(c) <= 0.2).sort((a, b) => luminance(a) - luminance(b));

  // El primario sale primero de las señales fuertes; si no hay, del más saturado.
  const primary = priority.find(isBrandy) || saturated[0];
  const rest = saturated.filter((c) => c !== primary);

  const palette: BrandColor[] = [];
  const add = (
    hex: string,
    role: BrandColor["role"],
    name: string,
    confidence: Confidence,
    source: BrandColor["source"] = "detected"
  ) => {
    if (!hex || palette.some((p) => p.hex === hex)) return;
    palette.push({ hex, role, name, source, confidence });
  };
  // Si el primario vino de una señal fuerte, la confianza es alta.
  if (primary) {
    const fromSignal = priority.includes(primary);
    add(primary, "primary", "Color principal", fromSignal ? "high" : "medium");
  }
  if (rest[0]) add(rest[0], "secondary", "Color secundario", "low");
  if (rest[1]) add(rest[1], "accent", "Color de acento", "low");
  // Si no se detectó un color claro/oscuro real, el blanco/negro genérico
  // se marca "inferred" (no "detected") para no mentirle al usuario.
  add(lights[0] || "#ffffff", "background", "Fondo", lights[0] ? "medium" : "low", lights[0] ? "detected" : "inferred");
  add(darks[0] || "#18181b", "text", "Texto", darks[0] ? "medium" : "low", darks[0] ? "detected" : "inferred");

  return {
    colors: {
      primary: palette.find((p) => p.role === "primary")?.hex,
      secondary: palette.find((p) => p.role === "secondary")?.hex,
      accent: palette.find((p) => p.role === "accent")?.hex,
      background: palette.find((p) => p.role === "background")?.hex,
      text: palette.find((p) => p.role === "text")?.hex,
      palette,
    },
    typography: {
      heading: raw.fontFamilies[0] || raw.googleFonts[0]
        ? { family: raw.fontFamilies[0] || raw.googleFonts[0], source: "detected", confidence: "medium" }
        : undefined,
      body: raw.fontFamilies[1] || raw.fontFamilies[0]
        ? { family: raw.fontFamilies[1] || raw.fontFamilies[0], source: "detected", confidence: "low" }
        : undefined,
    },
    logos: [
      ...raw.logoCandidates.map((url, i) => ({
        id: `logo_det_${i}`,
        type: "primary" as const,
        url,
        source: "detected" as const,
        selected: i === 0,
      })),
      ...(raw.favicon
        ? [{ id: "favicon_det", type: "favicon" as const, url: raw.favicon, source: "detected" as const, selected: false }]
        : []),
    ],
    visualStyle: { mood: [] },
    voiceTone: { toneTags: [] },
    brandKeywords: [],
    avoidList: [],
  };
}

function guessPrimaryConversion(s: RawWebContent["signals"]): { type: string; confidence: Confidence } {
  if (s.hasEcommerce) return { type: "Compra ecommerce", confidence: "high" };
  if (s.hasReservations) return { type: "Reserva", confidence: "medium" };
  if (s.hasWhatsappSales) return { type: "Mensaje por WhatsApp", confidence: "medium" };
  if (s.hasPhysicalStore) return { type: "Visita al local", confidence: "medium" };
  if (s.hasContactForm) return { type: "Formulario", confidence: "low" };
  return { type: "Consulta por DM", confidence: "low" };
}

const GOAL_BY_CONVERSION: Record<string, string> = {
  "Compra ecommerce": "Más tráfico al ecommerce",
  Reserva: "Más reservas",
  "Mensaje por WhatsApp": "Más consultas por WhatsApp",
  "Visita al local": "Más visitas al local",
  Formulario: "Más leads",
  "Consulta por DM": "Más consultas por DM",
};

export function buildBusinessIntelligenceFromRaw(raw: RawWebContent): BusinessIntelligence {
  const conv = guessPrimaryConversion(raw.signals);
  return {
    socialLinks: raw.socialLinks.map((s) => ({
      platform: s.platform,
      url: s.url,
      source: "detected" as const,
      confidence: "high" as Confidence,
    })),
    contactInfo: {
      whatsapp: raw.whatsapp || undefined,
      email: raw.emails[0],
      phone: raw.phones[0],
    },
    conversionPaths: { ...raw.signals },
    primaryConversion: {
      type: conv.type,
      source: conv.confidence === "high" ? "detected" : "suggested",
      confidence: conv.confidence,
    },
    valuePropositions: [],
    recommendedGoal: {
      goal: GOAL_BY_CONVERSION[conv.type] || "Más ventas",
      reason: `Por la web parece que tu conversión principal es: ${conv.type.toLowerCase()}.`,
      source: "suggested",
      confidence: conv.confidence,
    },
    analysisConfidence: 0,
  };
}

const STOPWORDS = new Set(
  "de la el en los las un una y o para por con que del al su sus es son más mas tu vos nos te se lo un una este esta como sobre".split(" ")
);

function topKeywords(text: string, n = 8): string[] {
  const words = text.toLowerCase().replace(/[^a-záéíóúñ\s]/gi, " ").split(/\s+/);
  const counts: Record<string, number> = {};
  for (const w of words) {
    if (w.length < 4 || STOPWORDS.has(w)) continue;
    counts[w] = (counts[w] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([w]) => w);
}

const INDUSTRY_HINTS: { re: RegExp; industry: string }[] = [
  { re: /(caf[eé]|restaurante|men[uú]|gastronom|bar |panader|paster|brunch|cocina)/i, industry: "Food & Beverage" },
  { re: /(tienda|shop|ecommerce|comprar|env[ií]o|carrito|catálogo)/i, industry: "E-commerce / Online Stores" },
  { re: /(peluquer|barber|spa|est[eé]tica|belleza|maquillaje|u[ñn]as)/i, industry: "Beauty & Personal Care" },
  { re: /(gimnasio|yoga|pilates|fitness|entrenamiento|nutric)/i, industry: "Health & Wellness" },
  { re: /(consultor|asesor|abogad|contador|estudio jur|arquitect)/i, industry: "Professional Services" },
  { re: /(inmobiliar|propiedad|alquiler|venta de casas)/i, industry: "Real Estate" },
  { re: /(indumentaria|ropa|moda|calzado|accesorios)/i, industry: "Fashion & Accessories" },
];

// Construye un análisis básico (sin IA) a partir del contenido crudo.
export function buildBasicAnalysis(raw: RawWebContent, url: string): WebsiteAnalysis {
  const name =
    (raw.ogTitle || raw.title || "").split(/[|\-–—·]/)[0].trim() || domainName(url);
  const fullText = [raw.title, raw.metaDescription, raw.ogDescription, ...raw.headings, ...raw.paragraphs].join(" ");
  const industry = INDUSTRY_HINTS.find((h) => h.re.test(fullText))?.industry || "";
  const brandKit = buildBrandKitFromRaw(raw);
  const bi = buildBusinessIntelligenceFromRaw(raw);
  brandKit.brandKeywords = topKeywords(fullText, 8);

  const channels = bi.socialLinks.map((s) => s.platform);
  const offerings = extractOfferings(raw);

  const fieldStatuses: Record<string, FieldStatus> = {};
  const found: WebsiteFoundFields = { brandKit, businessIntelligence: bi };
  if (offerings && offerings.length) {
    found.productsServices = offerings;
    fieldStatuses["productsServices"] = { status: "review", confidence: "low", source: "website" };
  }

  const setFound = (key: keyof WebsiteFoundFields, val: any, conf: Confidence = "high") => {
    (found as any)[key] = val;
    fieldStatuses[key as string] = { status: "found", confidence: conf, source: "website" };
  };
  const setSuggested = (key: keyof WebsiteFoundFields, val: any, conf: Confidence = "low") => {
    (found as any)[key] = val;
    fieldStatuses[key as string] = { status: "suggested", confidence: conf, source: "eva" };
  };

  if (name) setFound("name", name);
  setFound("websiteUrl", raw.url);
  const desc = raw.metaDescription || raw.ogDescription || "";
  if (desc) setFound("shortDescription", desc.slice(0, 200));
  const longDesc = raw.paragraphs.slice(0, 2).join(" ");
  if (longDesc) setSuggested("fullDescription", longDesc.slice(0, 500), "medium");
  if (industry) setSuggested("industry", industry, "medium");
  if (channels.length) setFound("marketingChannels", channels);

  // Todos los campos esperados del onboarding: lo que no se encontró/sugirió
  // queda como "Falta completar" para que el usuario lo vea claramente.
  const missing: string[] = [];
  const need = [
    "name",
    "industry",
    "subcategory",
    "businessType",
    "businessModel",
    "country",
    "state",
    "city",
    "shortDescription",
    "fullDescription",
    "values",
    "competitiveAdvantages",
    "marketingChannels",
    "marketingActivities",
    "seasonalityTags",
    "specialDates",
    "productsServices",
    "audience",
    "goals",
  ];
  for (const k of need) {
    const v = (found as any)[k];
    const empty = v == null || v === "" || (Array.isArray(v) && v.length === 0);
    if (empty && !fieldStatuses[k]) {
      fieldStatuses[k] = { status: "missing" };
      missing.push(k);
    }
  }

  const completed = Object.values(fieldStatuses).filter((f) => f.status === "found").length;
  const suggested = Object.values(fieldStatuses).filter((f) => f.status === "suggested").length;
  const review = Object.values(fieldStatuses).filter((f) => f.status === "review").length;
  // Confianza global aproximada
  const signals = [
    raw.title,
    desc,
    channels.length,
    raw.paragraphs.length,
    brandKit.colors.palette.length,
    bi.contactInfo.email || bi.contactInfo.whatsapp,
  ].filter(Boolean).length;
  const confidence = Math.min(0.85, 0.2 + signals * 0.1);
  bi.analysisConfidence = confidence;

  return {
    confidence,
    summary: {
      whatEvaUnderstood: desc || `Un negocio llamado ${name}.`,
      completedFieldsCount: completed,
      missingFieldsCount: missing.length,
      reviewFieldsCount: review + suggested,
    },
    foundFields: found,
    fieldStatuses,
    missingFields: missing,
    lowConfidenceFields: Object.entries(fieldStatuses)
      .filter(([, v]) => v.confidence === "low")
      .map(([k]) => k),
    notes: raw.reachable ? [] : ["No se pudo leer la web."],
    mode: "basic",
  };
}

// Detección conservadora de productos/servicios desde headings/nav.
// Sin IA esto es heurístico → todo va como "sugerido/revisar", nunca confirmado.
const GENERIC_HEADINGS =
  /(inicio|home|contacto|contact|nosotros|about|sobre|blog|men[uú]|carrito|cart|login|registr|preguntas|faq|t[eé]rminos|privacidad|newsletter|suscrib|seguinos|footer|menú principal)/i;

export function extractOfferings(raw: RawWebContent): WebsiteFoundFields["productsServices"] {
  const origin = (() => {
    try {
      return new URL(raw.url).origin;
    } catch {
      return "";
    }
  })();
  const paths = raw.internalLinks.map((l) => l.replace(origin, "").toLowerCase());
  const hasProductPaths = paths.some((p) => /\/(productos?|shop|tienda|catalogo|catálogo|menu|planes|pricing|precios)/.test(p));
  const hasServicePaths = paths.some((p) => /\/(servicios?|tratamientos|soluciones|features)/.test(p));
  const text = (raw.text + " " + raw.headings.join(" ")).toLowerCase();
  const hasSignals = hasProductPaths || hasServicePaths || /servicios|productos|planes|catálogo|catalogo/.test(text);
  if (!hasSignals) return [];

  const type: "producto" | "servicio" = hasServicePaths && !hasProductPaths ? "servicio" : "producto";

  // Candidatos: headings cortos, no genéricos.
  const candidates = uniq(raw.headings)
    .map((h) => h.trim())
    .filter((h) => {
      const words = h.split(/\s+/).length;
      return words >= 1 && words <= 4 && !GENERIC_HEADINGS.test(h) && !/[.!?]$/.test(h) && h.length >= 3;
    })
    .slice(0, 5);

  return candidates.map((name) => ({
    name,
    type,
    source: "website",
    confidence: "low" as const,
    shouldReview: true,
  }));
}

export function domainName(url: string): string {
  try {
    const host = new URL(normalizeUrl(url)).hostname.replace(/^www\./, "");
    const b = host.split(".")[0] || host;
    return b.replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
  } catch {
    return "";
  }
}
