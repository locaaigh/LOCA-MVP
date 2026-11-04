// ─────────────────────────────────────────────────────────────
// Capturas de pantalla de la web del negocio (plan B de lectura).
// Proveedor configurable, en este orden:
//   1. BROWSERLESS_URL (+ BROWSERLESS_TOKEN): POST /screenshot y /content (HTML renderizado).
//   2. SCREENSHOT_URL_TEMPLATE: cualquier servicio HTTP de capturas; "{url}" se reemplaza
//      por la URL codificada (ej. https://api.screenshotone.com/take?access_key=...&url={url}&full_page=true).
//   3. puppeteer-core + @sparticuz/chromium si están instalados (opcional, para Vercel).
// Sin ninguno configurado → `isScreenshotConfigured()` = false y el plan B no corre.
// ─────────────────────────────────────────────────────────────

export interface Screenshot {
  page: string;
  bytes: Buffer;
  mimeType: "image/png" | "image/jpeg";
}

export interface CaptureResult {
  providerId: "browserless" | "template" | "puppeteer";
  shots: Screenshot[];
  /** Texto visible de la página renderizada (si el proveedor lo permite). */
  renderedText?: string;
  warnings: string[];
}

const VIEWPORT = { width: 1366, height: 2400 };
const MAX_PAGES = 4;

function hasBrowserless(): boolean {
  return !!process.env.BROWSERLESS_URL;
}
function hasTemplate(): boolean {
  return !!process.env.SCREENSHOT_URL_TEMPLATE && process.env.SCREENSHOT_URL_TEMPLATE.includes("{url}");
}

let puppeteerAvailable: boolean | undefined;
async function loadPuppeteer(): Promise<{ puppeteer: PuppeteerLike; chromium: ChromiumLike } | null> {
  if (puppeteerAvailable === false) return null;
  try {
    const p = "puppeteer-core";
    const c = "@sparticuz/chromium";
    const [puppeteer, chromium] = await Promise.all([
      import(/* webpackIgnore: true */ p) as Promise<PuppeteerLike | { default: PuppeteerLike }>,
      import(/* webpackIgnore: true */ c) as Promise<ChromiumLike | { default: ChromiumLike }>,
    ]);
    puppeteerAvailable = true;
    return {
      puppeteer: ("default" in puppeteer ? puppeteer.default : puppeteer) as PuppeteerLike,
      chromium: ("default" in chromium ? chromium.default : chromium) as ChromiumLike,
    };
  } catch {
    puppeteerAvailable = false;
    return null;
  }
}

interface PuppeteerPage {
  setViewport(v: { width: number; height: number }): Promise<void>;
  goto(url: string, opts?: { waitUntil?: string; timeout?: number }): Promise<unknown>;
  screenshot(opts: { type: "jpeg" | "png"; quality?: number; fullPage?: boolean }): Promise<Buffer | Uint8Array>;
  evaluate<T>(fn: () => T): Promise<T>;
}
interface PuppeteerBrowser {
  newPage(): Promise<PuppeteerPage>;
  close(): Promise<void>;
}
interface PuppeteerLike {
  launch(opts: Record<string, unknown>): Promise<PuppeteerBrowser>;
}
interface ChromiumLike {
  args: string[];
  executablePath(): Promise<string>;
  headless?: boolean | "shell";
}

export async function isScreenshotConfigured(): Promise<boolean> {
  if (hasBrowserless() || hasTemplate()) return true;
  return !!(await loadPuppeteer());
}

async function fetchBytes(url: string, init: RequestInit, timeoutMs = 25_000): Promise<{ bytes: Buffer; contentType: string } | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) return null;
    return { bytes: Buffer.from(await res.arrayBuffer()), contentType: res.headers.get("content-type") || "" };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function mimeOf(contentType: string, bytes: Buffer): "image/png" | "image/jpeg" | null {
  if (contentType.includes("png") || (bytes[0] === 0x89 && bytes[1] === 0x50)) return "image/png";
  if (contentType.includes("jpeg") || contentType.includes("jpg") || (bytes[0] === 0xff && bytes[1] === 0xd8)) return "image/jpeg";
  return null;
}

async function captureBrowserless(urls: string[]): Promise<CaptureResult> {
  const base = (process.env.BROWSERLESS_URL || "").replace(/\/$/, "");
  const token = process.env.BROWSERLESS_TOKEN ? `?token=${encodeURIComponent(process.env.BROWSERLESS_TOKEN)}` : "";
  const warnings: string[] = [];
  const shots: Screenshot[] = [];
  let renderedText: string | undefined;
  for (const url of urls) {
    const r = await fetchBytes(`${base}/screenshot${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, options: { type: "jpeg", quality: 80, fullPage: false }, viewport: VIEWPORT, gotoOptions: { waitUntil: "networkidle2", timeout: 20000 } }),
    });
    const mime = r && mimeOf(r.contentType, r.bytes);
    if (r && mime) shots.push({ page: url, bytes: r.bytes, mimeType: mime });
    else warnings.push(`Sin captura de ${url}`);
  }
  const html = await fetchBytes(`${base}/content${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: urls[0], gotoOptions: { waitUntil: "networkidle2", timeout: 20000 } }),
  });
  if (html) renderedText = htmlToText(html.bytes.toString("utf8"));
  return { providerId: "browserless", shots, renderedText, warnings };
}

async function captureTemplate(urls: string[]): Promise<CaptureResult> {
  const template = process.env.SCREENSHOT_URL_TEMPLATE || "";
  let headers: Record<string, string> = {};
  try {
    headers = process.env.SCREENSHOT_API_HEADERS ? (JSON.parse(process.env.SCREENSHOT_API_HEADERS) as Record<string, string>) : {};
  } catch {
    headers = {};
  }
  const warnings: string[] = [];
  const shots: Screenshot[] = [];
  for (const url of urls) {
    const r = await fetchBytes(template.replace("{url}", encodeURIComponent(url)), { headers });
    const mime = r && mimeOf(r.contentType, r.bytes);
    if (r && mime) shots.push({ page: url, bytes: r.bytes, mimeType: mime });
    else warnings.push(`Sin captura de ${url}`);
  }
  return { providerId: "template", shots, warnings };
}

async function capturePuppeteer(urls: string[]): Promise<CaptureResult> {
  const mods = await loadPuppeteer();
  if (!mods) return { providerId: "puppeteer", shots: [], warnings: ["puppeteer-core / @sparticuz/chromium no instalados"] };
  const { puppeteer, chromium } = mods;
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless ?? true,
    defaultViewport: VIEWPORT,
  });
  const warnings: string[] = [];
  const shots: Screenshot[] = [];
  let renderedText: string | undefined;
  try {
    for (const url of urls) {
      try {
        const page = await browser.newPage();
        await page.setViewport(VIEWPORT);
        await page.goto(url, { waitUntil: "networkidle2", timeout: 25_000 });
        const shot = await page.screenshot({ type: "jpeg", quality: 80, fullPage: false });
        shots.push({ page: url, bytes: Buffer.from(shot), mimeType: "image/jpeg" });
        if (!renderedText) renderedText = await page.evaluate(() => document.body?.innerText?.slice(0, 20000) ?? "");
      } catch (e) {
        warnings.push(`Sin captura de ${url}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  } finally {
    await browser.close();
  }
  return { providerId: "puppeteer", shots, renderedText, warnings };
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 20000);
}

/** Captura la home y hasta 3 páginas internas. Devuelve null si no hay proveedor configurado. */
export async function captureWebsite(url: string, internalPages: string[] = []): Promise<CaptureResult | null> {
  const urls = [url, ...internalPages.filter((p) => p && p !== url)].slice(0, MAX_PAGES);
  if (hasBrowserless()) return captureBrowserless(urls);
  if (hasTemplate()) return captureTemplate(urls);
  if (await loadPuppeteer()) return capturePuppeteer(urls);
  return null;
}
