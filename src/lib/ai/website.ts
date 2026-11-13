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
  // Nombre del sitio declarado por la plataforma (og:site_name). Shopify,
  // Tiendanube y WordPress lo setean con el nombre REAL de la marca, mucho más
  // confiable que el <title> (que suele ser un título SEO o "Inicio - X").
  ogSiteName: string;
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
  // Cuántas veces aparece cada color (clave: hex normalizado) en HTML+CSS.
  // El color de marca real se repite (botones, links, titulares); los defaults
  // del framework aparecen una vez. Sin frecuencia, un hex suelto bien saturado
  // le gana al color real.
  colorCounts: Record<string, number>;
  // Colores dominantes del logo (la señal más fuerte del color real de marca).
  logoColors: string[];
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

// UA de navegador: muchos sitios bloquean clientes que no parecen un navegador.
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
// UA neutral: algunos sitios con anti-bot por fingerprint TLS resetean la conexión
// cuando el UA dice "Chrome" pero el cliente no lo es (ej. marketing.infinidad.ai).
// Con un UA honesto pasan. Se usa como reintento.
const NEUTRAL_UA = "LOCABot/1.0 (+https://loca.ai; análisis de sitios para onboarding)";

async function fetchHtmlWithUA(url: string, ua: string, timeoutMs: number): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": ua,
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

async function fetchHtml(url: string, timeoutMs = 7000): Promise<string | null> {
  // Primario: UA de navegador. Si falla (null / conexión reseteada), reintento con
  // UA neutral para los sitios que bloquean navegadores "falsos" por fingerprint.
  const browser = await fetchHtmlWithUA(url, BROWSER_UA, timeoutMs);
  if (browser) return browser;
  return fetchHtmlWithUA(url, NEUTRAL_UA, timeoutMs);
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
  colorCounts: Record<string, number>;
  fontFamilies: string[];
  googleFonts: string[];
} {
  const occurrences = [
    ...matchAll(text, /#[0-9a-fA-F]{6}\b/),
    ...matchAll(text, /#[0-9a-fA-F]{3}\b/),
    ...extractFunctionalColors(text),
  ];
  const colorCounts: Record<string, number> = {};
  for (const c of occurrences) {
    const n = norm6(c);
    colorCounts[n] = (colorCounts[n] || 0) + 1;
  }
  const cssColors = uniq(occurrences);
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
  return { cssColors, priorityColors, colorCounts, fontFamilies, googleFonts };
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
  const { cssColors: htmlColors, priorityColors: htmlPriority, colorCounts, fontFamilies, googleFonts } =
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
    ogSiteName: metaContent(html, "og:site_name", "property"),
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
    colorCounts,
    fontFamilies,
    googleFonts,
    text,
    signals: {
      // Solo señales FUERTES de ecommerce real (plataforma o flujo de carrito/checkout).
      // Palabras sueltas como "comprar"/"catálogo"/"tienda"/"carrito" generan falsos
      // positivos en agencias y servicios B2B (ej. marketing.infinidad.ai salía "Compra
      // ecommerce" con confianza alta). Ver fix análisis web, 2026-11.
      hasEcommerce:
        /(add to cart|add_to_cart|data-product_id|agregar al carrito|finalizar compra|finaliz[aá] compra|woocommerce|shopify|tiendanube|mercadoshops|snipcart|wc-ajax|\/cart\b|\/checkout\b|\/shop\b)/.test(lower),
      hasWhatsappSales: !!whatsapp || /wa\.me|whatsapp/.test(lower),
      // Reserva/turno real (restaurantes, salones, salud), no un genérico "agendá una
      // reunión" que usa cualquier B2B. Por eso se piden términos específicos de turno.
      hasReservations: /(reservar\b|reservá|reserva online|booking|turnos?\b|sacar turno|agendar (cita|turno|hora))/.test(lower),
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
  for (const [hex, n] of Object.entries(add.colorCounts || {})) {
    base.colorCounts[hex] = (base.colorCounts[hex] || 0) + n;
  }
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
    ogSiteName: "",
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
    colorCounts: {},
    logoColors: [],
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
    ogSiteName: home.ogSiteName,
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
      for (const [hex, n] of Object.entries(fromCss.colorCounts)) {
        base.colorCounts[hex] = (base.colorCounts[hex] || 0) + n;
      }
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
  base.logoColors = await extractLogoColors([...base.logoCandidates, base.favicon]);
  return base;
}

// ── Colores del logo ─────────────────────────────────────────
// El logo es la señal más directa del color real de marca (el CSS trae además
// defaults del theme, botones sociales, etc.). Se baja el logo detectado, se
// reduce con sharp y se cuentan los píxeles con color real (se descartan
// transparencias, blancos/negros de fondo y grises). Si sharp no está
// disponible o la imagen no se puede leer (.ico, SVG raro), se omite sin romper.
async function extractLogoColors(candidates: string[]): Promise<string[]> {
  const url = candidates.find((u) => u && /^https?:\/\//.test(u) && !/\.ico(\?|$)/i.test(u));
  if (!url) return [];
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 3500);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": BROWSER_UA } });
    if (!res.ok) return [];
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length || buf.length > 2_000_000) return [];
    const sharp = (await import("sharp")).default;
    const { data } = await sharp(buf)
      .resize(48, 48, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    // Bins gruesos de color (8 niveles por canal) para que el antialiasing no
    // disperse un mismo tono; se promedian los píxeles de cada bin para
    // devolver el color real y no el centro del bin.
    const bins = new Map<string, { n: number; r: number; g: number; b: number }>();
    for (let i = 0; i + 3 < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a < 128) continue;
      const max = Math.max(r, g, b) / 255;
      const min = Math.min(r, g, b) / 255;
      const l = (max + min) / 2;
      const s = max === min ? 0 : l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
      if (l > 0.93 || l < 0.08 || s < 0.25) continue;
      const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
      const e = bins.get(key) || { n: 0, r: 0, g: 0, b: 0 };
      e.n++; e.r += r; e.g += g; e.b += b;
      bins.set(key, e);
    }
    return [...bins.values()]
      .filter((e) => e.n >= 8) // menos de ~8px es antialiasing/ruido
      .sort((x, y) => y.n - x.n)
      .slice(0, 3)
      .map((e) => toHex(e.r / e.n, e.g / e.n, e.b / e.n));
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
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

// Colores "de fábrica" que aparecen en el CSS de casi cualquier sitio y NO son
// de la marca: defaults de frameworks/UI kits y colores de marcas sociales
// embebidas (botones de WhatsApp/Instagram/Facebook/etc.). Solo se descartan
// como candidatos heurísticos; si el sitio los declara como --brand/--primary
// o theme-color, se respetan igual.
const FRAMEWORK_SOCIAL_COLORS = new Set([
  "#007aff", // iOS / links de Safari
  "#007bff", "#0056b3", "#0d6efd", "#0b5ed7", "#0a58ca", // Bootstrap
  "#1877f2", "#4267b2", "#3b5998", // Facebook
  "#25d366", "#128c7e", "#075e54", "#00a884", // WhatsApp
  "#e4405f", "#c13584", "#833ab4", "#fd1d1d", // Instagram
  "#ff0000", "#cc0000", // YouTube
  "#1da1f2", "#1d9bf0", // Twitter/X
  "#0a66c2", "#0077b5", // LinkedIn
  "#e60023", "#bd081c", // Pinterest
  "#ee1d52", "#69c9d0", // TikTok
  "#5865f2", "#7289da", // Discord
  "#1db954", // Spotify
  "#4285f4", "#ea4335", "#fbbc05", "#34a853", // Google
  "#635bff", "#0070ba", "#003087", "#ffc439", // Stripe / PayPal
]);

// Distancia RGB simple: evita que secundario/acento sean casi el mismo color
// que el primario (variantes hover/sombras del mismo tono).
function colorDistance(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

export function buildBrandKitFromRaw(raw: RawWebContent): BrandKit {
  const colors = uniq(raw.cssColors.map(norm6)).filter((c) => /^#[0-9a-f]{6}$/.test(c));
  // Colores con señal fuerte de marca (theme-color / variables --brand/--primary).
  const priority = uniq((raw.priorityColors || []).map(norm6)).filter((c) => /^#[0-9a-f]{6}$/.test(c));
  // Colores dominantes del logo (señal fuerte, ya filtrados de fondos/grises).
  const logo = uniq((raw.logoColors || []).map(norm6)).filter((c) => /^#[0-9a-f]{6}$/.test(c));
  const counts = raw.colorCounts || {};
  // Un color "de marca" usable: ni casi blanco ni casi negro, con algo de color.
  const isBrandy = (c: string) => saturation(c) > 0.15 && luminance(c) > 0.08 && luminance(c) < 0.92;

  // Candidatos heurísticos ordenados por FRECUENCIA de uso: el color de marca
  // se repite por todo el CSS (botones, links, títulos); un hex suelto muy
  // saturado suele ser decorativo. El umbral de saturación es BAJO (0.12) a
  // propósito: muchas marcas usan colores terrosos/apagados (verde oliva,
  // bordó, tierra) con saturación ~0.15-0.22 que un corte alto descartaría,
  // dejando ganar un color vivo pero raro. Solo se excluyen los neutros reales
  // (grises) y los defaults de framework/sociales; la frecuencia decide el
  // resto (con la saturación como desempate suave).
  const score = (c: string) => (counts[c] || 1) * (0.5 + saturation(c));
  const saturated = colors
    .filter((c) => saturation(c) > 0.12 && luminance(c) > 0.08 && luminance(c) < 0.95)
    .filter((c) => !FRAMEWORK_SOCIAL_COLORS.has(c))
    .sort((a, b) => score(b) - score(a));
  const lights = colors.filter((c) => luminance(c) >= 0.9).sort((a, b) => luminance(b) - luminance(a));
  const darks = colors.filter((c) => luminance(c) <= 0.2).sort((a, b) => luminance(a) - luminance(b));

  // Primario: señal explícita del sitio > logo > el candidato con mejor score.
  const primary = priority.find(isBrandy) || logo.find(isBrandy) || saturated[0];
  // Secundario/acento: primero los otros colores del logo, después el CSS;
  // siempre visualmente distintos de lo ya elegido (no variantes del mismo tono).
  const chosen: string[] = primary ? [primary] : [];
  const distinct = (c: string) => chosen.every((p) => colorDistance(c, p) > 60);
  const rest: { hex: string; fromLogo: boolean }[] = [];
  for (const c of [...logo.filter(isBrandy), ...saturated]) {
    if (rest.length >= 2) break;
    if (c === primary || !distinct(c) || rest.some((r) => r.hex === c)) continue;
    rest.push({ hex: c, fromLogo: logo.includes(c) });
    chosen.push(c);
  }

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
  // Si el primario vino de una señal fuerte (variable de marca o logo), la
  // confianza es alta/media; si salió de la heurística de CSS, media.
  if (primary) {
    const fromSignal = priority.includes(primary) || logo.includes(primary);
    add(primary, "primary", "Color principal", fromSignal ? "high" : "medium");
  }
  if (rest[0]) add(rest[0].hex, "secondary", "Color secundario", rest[0].fromLogo ? "medium" : "low");
  if (rest[1]) add(rest[1].hex, "accent", "Color de acento", rest[1].fromLogo ? "medium" : "low");
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
  if (s.hasEcommerce) return { type: "Compra ecommerce", confidence: "medium" };
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

// Títulos genéricos que NO son el nombre del negocio ("Inicio - Mi Empresa",
// "Home", páginas en construcción, etc.). Si el título cae acá, el nombre lo
// decide la IA (o queda pendiente), nunca se da por "encontrado".
const GENERIC_NAME_RE =
  /^(inicio|home|bienvenidos?|welcome|p[áa]gina (principal|de inicio)|my site|mi sitio( web)?|untitled|sin t[íi]tulo|index|default|new site|website|web site|under construction|en construcci[óo]n|coming soon|pr[óo]ximamente|tienda( online)?|shop|store)$/i;

// Texto de plantilla/tema que los sitios olvidan reemplazar (demos de Avada /
// Elementor / Divi / WooCommerce, "Just another WordPress site"...). Eso NO
// describe el negocio real: si la meta description es esto, se descarta y la
// descripción la redacta la IA a partir del contenido. (Bug real: mateando
// mostraba "Explore Avada's Ecommerce prebuilt website..." como descripción.)
const BOILERPLATE_DESC_RE =
  /(avada|elementor|divi theme|betheme|oceanwp|astra theme|prebuilt website|website template|theme demo|demo (site|store)|just another wordpress|woocommerce (theme|integration)|lorem ipsum|this is a sample|sample page|sitio (web )?en construcci[óo]n|p[áa]gina en construcci[óo]n|under construction|coming soon|powered by (wordpress|shopify|wix)|create your (own )?website|build (your|a) (stunning |beautiful )?website)/i;

export function isBoilerplateDescription(desc: string): boolean {
  return BOILERPLATE_DESC_RE.test(desc);
}

// ¿Este texto parece el NOMBRE de una marca (y no un genérico ni una frase
// SEO tipo "Comprá yerba al mejor precio")? Corto, sin palabras de venta.
function looksLikeBrandName(s: string): boolean {
  if (!s || GENERIC_NAME_RE.test(s)) return false;
  if (s.split(/\s+/).length > 5) return false;
  return !/(compr[aá]|precio|env[íi]os?|ofertas?|descuentos?|venta de|los mejores|la mejor)/i.test(s);
}

// Construye un análisis básico (sin IA) a partir del contenido crudo.
export function buildBasicAnalysis(raw: RawWebContent, url: string): WebsiteAnalysis {
  // Nombre: primer segmento del título si parece un nombre real; si el título
  // es genérico ("Inicio - X") o una frase SEO, cae a og:site_name. Los guiones
  // solo separan con espacios alrededor ("Coca-Cola" no se corta). Si ninguno
  // sirve, va el dominio como sugerencia (no "encontrado") para que la IA lo
  // corrija con el nombre real — antes el título SEO quedaba clavado como nombre.
  const fromTitle = (raw.ogTitle || raw.title || "").split(/\s*[|·]\s*|\s+[-–—]\s+/)[0].trim();
  const name = [fromTitle, (raw.ogSiteName || "").trim()].find(looksLikeBrandName) || "";
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
  else setSuggested("name", domainName(url), "low");
  setFound("websiteUrl", raw.url);
  // La meta description solo cuenta como dato "encontrado" (intocable para la
  // IA) si parece una descripción real: no boilerplate de plantilla, con largo
  // razonable y que no sea un eco del título. Si es floja, queda como sugerencia
  // de confianza baja para que la IA la reescriba desde el contenido real.
  const descRaw = raw.metaDescription || raw.ogDescription || "";
  const desc = isBoilerplateDescription(descRaw) ? "" : descRaw;
  const descLooksReal =
    desc.length >= 40 && desc.trim().toLowerCase() !== (raw.title || "").trim().toLowerCase();
  if (desc && descLooksReal) setFound("shortDescription", desc.slice(0, 200));
  else if (desc) setSuggested("shortDescription", desc.slice(0, 200), "low");
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
      whatEvaUnderstood: desc || `Un negocio llamado ${name || domainName(url)}.`,
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
