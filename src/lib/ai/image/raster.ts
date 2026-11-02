// ─────────────────────────────────────────────────────────────
// Operaciones sobre bytes de imagen: dimensiones (parser de cabecera, sin
// dependencias), resize exacto + JPEG y composite del overlay (con `sharp`,
// cargado dinámicamente: si no está instalado, la app sigue funcionando sin
// resize y lo avisa). `sharp` es dependencia recomendada en package.json.
// ─────────────────────────────────────────────────────────────

export interface ImageDimensions {
  width: number;
  height: number;
  type: "png" | "jpeg" | "webp" | "gif" | "unknown";
}

/** Lee ancho/alto de PNG, JPEG, WEBP (VP8/VP8L/VP8X) y GIF sin decodificar. */
export function readImageDimensions(buf: Buffer): ImageDimensions {
  const none: ImageDimensions = { width: 0, height: 0, type: "unknown" };
  if (buf.length < 24) return none;
  // PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), type: "png" };
  }
  // GIF
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
    return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8), type: "gif" };
  }
  // WEBP
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const chunk = buf.toString("ascii", 12, 16);
    if (chunk === "VP8X" && buf.length >= 30) {
      return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3), type: "webp" };
    }
    if (chunk === "VP8 " && buf.length >= 30) {
      return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff, type: "webp" };
    }
    if (chunk === "VP8L" && buf.length >= 25) {
      const b = buf.readUInt32LE(21);
      return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1, type: "webp" };
    }
    return { ...none, type: "webp" };
  }
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = buf[i + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      const len = buf.readUInt16BE(i + 2);
      const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7), type: "jpeg" };
      i += 2 + len;
    }
    return { ...none, type: "jpeg" };
  }
  return none;
}

export function mimeFromBytes(buf: Buffer): string {
  const t = readImageDimensions(buf).type;
  return t === "png" ? "image/png" : t === "jpeg" ? "image/jpeg" : t === "webp" ? "image/webp" : t === "gif" ? "image/gif" : "application/octet-stream";
}

export function toDataUrl(bytes: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}

export function fromDataUrl(dataUrl: string): { bytes: Buffer; mimeType: string } | null {
  const m = dataUrl.match(/^data:([a-z0-9/+.-]+);base64,(.+)$/i);
  if (!m) return null;
  return { bytes: Buffer.from(m[2], "base64"), mimeType: m[1] };
}

// ── sharp (opcional) ─────────────────────────────────────────
interface SharpLike {
  resize(w: number, h: number, opts?: { fit?: string; position?: string }): SharpLike;
  jpeg(opts?: { quality?: number; mozjpeg?: boolean }): SharpLike;
  png(): SharpLike;
  ensureAlpha(): SharpLike;
  composite(items: Array<{ input: Buffer; blend?: string; top?: number; left?: number }>): SharpLike;
  toBuffer(): Promise<Buffer>;
}
type SharpFactory = (input: Buffer) => SharpLike;

let sharpFactory: SharpFactory | null | undefined;
let warned = false;

export async function getSharp(): Promise<SharpFactory | null> {
  if (sharpFactory !== undefined) return sharpFactory;
  try {
    const modName = "sharp";
    const mod = (await import(/* webpackIgnore: true */ modName)) as { default?: SharpFactory } | SharpFactory;
    sharpFactory = (typeof mod === "function" ? mod : mod.default) ?? null;
  } catch {
    sharpFactory = null;
  }
  if (!sharpFactory && !warned) {
    warned = true;
    console.warn("[LOCA] `sharp` no está instalado: las imágenes no se redimensionan a 1080 px exactos ni se convierten a JPEG. Instalá con `npm install sharp`.");
  }
  return sharpFactory;
}

export function hasSharp(): Promise<boolean> {
  return getSharp().then((s) => !!s);
}

/**
 * Lleva la imagen a las dimensiones finales exactas (cover + recorte centrado,
 * para el 16:9 → 1.91:1 de LinkedIn) y la convierte a JPEG (Instagram solo
 * acepta JPEG por URL). Sin sharp devuelve los bytes originales.
 */
export async function finalizeImage(
  bytes: Buffer,
  target: { width: number; height: number },
  opts?: { quality?: number }
): Promise<{ bytes: Buffer; mimeType: string; width: number; height: number; resized: boolean }> {
  const sharp = await getSharp();
  if (!sharp) {
    const d = readImageDimensions(bytes);
    return { bytes, mimeType: mimeFromBytes(bytes), width: d.width, height: d.height, resized: false };
  }
  const out = await sharp(bytes)
    .resize(target.width, target.height, { fit: "cover", position: "centre" })
    .jpeg({ quality: opts?.quality ?? 90, mozjpeg: true })
    .toBuffer();
  return { bytes: out, mimeType: "image/jpeg", width: target.width, height: target.height, resized: true };
}

/** Compone el PNG del overlay (con alfa, mismas dimensiones) sobre el fondo y devuelve JPEG. */
export async function compositeOverlay(background: Buffer, overlayPng: Buffer): Promise<{ bytes: Buffer; mimeType: string } | null> {
  const sharp = await getSharp();
  if (!sharp) return null;
  const out = await sharp(background)
    .composite([{ input: overlayPng, blend: "over" }])
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
  return { bytes: out, mimeType: "image/jpeg" };
}

/** Versión chica para mandar a un modelo de visión (menos tokens). */
export async function downscaleForVision(bytes: Buffer, maxSide = 1024): Promise<{ bytes: Buffer; mimeType: string }> {
  const sharp = await getSharp();
  const d = readImageDimensions(bytes);
  if (!sharp || !d.width || Math.max(d.width, d.height) <= maxSide) return { bytes, mimeType: mimeFromBytes(bytes) };
  const scale = maxSide / Math.max(d.width, d.height);
  const out = await sharp(bytes)
    .resize(Math.round(d.width * scale), Math.round(d.height * scale), { fit: "cover" })
    .jpeg({ quality: 80 })
    .toBuffer();
  return { bytes: out, mimeType: "image/jpeg" };
}
