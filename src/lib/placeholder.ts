import type { ImageFormat } from "./types";

export const IMAGE_DIMENSIONS: Record<ImageFormat, { w: number; h: number }> = {
  "1:1": { w: 1024, h: 1024 },
  "4:5": { w: 1024, h: 1280 },
  "9:16": { w: 1024, h: 1792 },
};

// Para OpenAI gpt-image-1 los tamaños válidos son 1024x1024, 1024x1536, 1536x1024.
export function openAiSize(format: ImageFormat): string {
  switch (format) {
    case "1:1":
      return "1024x1024";
    case "4:5":
      return "1024x1536";
    case "9:16":
      return "1024x1536";
    default:
      return "1024x1024";
  }
}

// Placeholder lindo y de marca, como data URL SVG (liviano, no rompe localStorage)
export function brandedPlaceholder(opts: {
  format: ImageFormat;
  label?: string;
  concept?: string;
}): string {
  const { w, h } = IMAGE_DIMENSIONS[opts.format];
  const label = (opts.label || "LOCA").slice(0, 40);
  const concept = (opts.concept || "Imagen simulada — modo demo").slice(0, 80);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ec4899"/>
      <stop offset="0.6" stop-color="#db2777"/>
      <stop offset="1" stop-color="#9d174d"/>
    </linearGradient>
    <radialGradient id="r" cx="0.8" cy="0.2" r="0.9">
      <stop offset="0" stop-color="#a3e635" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#a3e635" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <rect width="${w}" height="${h}" fill="url(#r)"/>
  <g fill="#ffffff" font-family="Arial, sans-serif" text-anchor="middle">
    <text x="${w / 2}" y="${h * 0.46}" font-size="${Math.round(w * 0.13)}" font-weight="800" letter-spacing="2">LOCA</text>
    <text x="${w / 2}" y="${h * 0.55}" font-size="${Math.round(w * 0.035)}" opacity="0.9">${escapeXml(label)}</text>
    <text x="${w / 2}" y="${h * 0.92}" font-size="${Math.round(w * 0.028)}" opacity="0.85">${escapeXml(concept)}</text>
  </g>
</svg>`.trim();
  const base64 =
    typeof window === "undefined"
      ? Buffer.from(svg).toString("base64")
      : btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64}`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
