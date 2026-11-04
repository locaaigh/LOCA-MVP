// ─────────────────────────────────────────────────────────────
// Overlay de texto por código (next/og → Satori + resvg). El modelo de
// imagen genera el fondo SIN texto; acá se compone titular, bajada, precio y
// CTA con la fuente y la paleta de la marca. Tildes, ñ, ¿¡ y "$12.900"
// salen exactos (verificado 25-10-2026).
// Tres tratamientos: minimal_serif · bold_oversized · promo.
// ─────────────────────────────────────────────────────────────
import React from "react";
import { ImageResponse } from "next/og";
import type { Business, ImageFormat } from "@/lib/types";
import type { OverlaySpec } from "../types";
import { TYPOGRAPHIC_TREATMENTS } from "./style-catalog";
import { resolveOverlayFont } from "./fonts";
import { compositeOverlay, finalizeImage, readImageDimensions } from "./raster";
import { FINAL_DIMENSIONS } from "./formats";

export interface OverlayPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export function paletteFromBusiness(b: Business): OverlayPalette {
  const bk = b.brandKit?.colors;
  const byRole = (role: string) => bk?.palette?.find((c) => c.role === role)?.hex;
  const primary = bk?.primary || byRole("primary") || b.brandColors?.[0] || "#1f1f1f";
  const secondary = bk?.secondary || byRole("secondary") || b.brandColors?.[1] || "#f3efe8";
  const accent = bk?.accent || byRole("accent") || b.brandColors?.[2] || primary;
  const background = bk?.background || byRole("background") || "#f5f0e8";
  const text = bk?.text || byRole("text") || "#1a1a1a";
  return { primary, secondary, accent, background, text };
}

function luminance(hex: string): number {
  const m = hex.replace("#", "");
  const n = m.length === 3 ? m.split("").map((c) => c + c).join("") : m.padEnd(6, "0");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function readableTextOn(bgHex: string): string {
  return luminance(bgHex) > 0.45 ? "#111111" : "#ffffff";
}

function headlineSize(text: string, width: number, base: number): number {
  const len = text.length;
  let size = width * base;
  if (len > 28) size *= 0.85;
  if (len > 44) size *= 0.78;
  if (len > 64) size *= 0.75;
  if (len > 90) size *= 0.75;
  return Math.round(size);
}

const h = React.createElement;

interface Layout {
  spec: OverlaySpec;
  width: number;
  height: number;
  palette: OverlayPalette;
  fontName: string;
  safeArea: { top: number; bottom: number };
  /** true cuando el overlay va sobre una imagen (necesita scrim). */
  overImage: boolean;
}

function scrimStyle(zone: OverlaySpec["zone"], dark: boolean): React.CSSProperties {
  const c = dark ? "0,0,0" : "255,255,255";
  const gradient =
    zone === "top"
      ? `linear-gradient(180deg, rgba(${c},0.72) 0%, rgba(${c},0.55) 60%, rgba(${c},0) 100%)`
      : zone === "bottom"
        ? `linear-gradient(0deg, rgba(${c},0.75) 0%, rgba(${c},0.55) 60%, rgba(${c},0) 100%)`
        : zone === "left"
          ? `linear-gradient(90deg, rgba(${c},0.75) 0%, rgba(${c},0.5) 55%, rgba(${c},0) 100%)`
          : `linear-gradient(180deg, rgba(${c},0) 0%, rgba(${c},0.6) 30%, rgba(${c},0.6) 70%, rgba(${c},0) 100%)`;
  return { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: gradient, display: "flex" };
}

function renderTree(l: Layout): React.ReactElement {
  const { spec, width, height, palette, fontName, safeArea } = l;
  const pad = Math.round(width * 0.074);
  const padTop = Math.round(height * safeArea.top) + pad;
  const padBottom = Math.round(height * safeArea.bottom) + pad;
  const t = TYPOGRAPHIC_TREATMENTS[spec.treatment];
  const zone = spec.zone || t.zone;
  const justify = zone === "top" ? "flex-start" : zone === "bottom" ? "flex-end" : "center";

  const dark = spec.treatment !== "minimal_serif";
  const textColor = l.overImage ? (dark ? "#ffffff" : "#111111") : readableTextOn(palette.background);
  const accentText = readableTextOn(palette.accent);

  const children: React.ReactElement[] = [];

  if (spec.treatment === "promo" && spec.price) {
    children.push(
      h(
        "div",
        {
          style: {
            display: "flex",
            alignSelf: "flex-start",
            background: palette.accent,
            color: accentText,
            fontSize: headlineSize(spec.price, width, 0.11),
            fontWeight: 800,
            padding: `${Math.round(width * 0.015)}px ${Math.round(width * 0.04)}px`,
            borderRadius: Math.round(width * 0.03),
            marginBottom: Math.round(width * 0.03),
            lineHeight: 1.1,
          },
        },
        spec.price
      )
    );
  }

  const base = spec.treatment === "bold_oversized" ? 0.115 : spec.treatment === "promo" ? 0.085 : 0.082;
  children.push(
    h(
      "div",
      {
        style: {
          display: "flex",
          fontSize: headlineSize(spec.headline, width, base),
          fontWeight: spec.treatment === "minimal_serif" ? 600 : 900,
          lineHeight: 1.05,
          color: textColor,
          textTransform: spec.treatment === "bold_oversized" ? "uppercase" : "none",
          letterSpacing: spec.treatment === "bold_oversized" ? "-0.02em" : "0",
          width: zone === "left" ? "62%" : "100%",
          flexWrap: "wrap",
        },
      },
      spec.headline
    )
  );

  if (spec.subheadline) {
    children.push(
      h(
        "div",
        {
          style: {
            display: "flex",
            fontSize: Math.round(width * 0.036),
            lineHeight: 1.3,
            color: textColor,
            opacity: 0.92,
            marginTop: Math.round(width * 0.025),
            width: zone === "left" ? "62%" : "92%",
            flexWrap: "wrap",
          },
        },
        spec.subheadline
      )
    );
  }

  if (spec.treatment !== "promo" && spec.price) {
    children.push(
      h(
        "div",
        { style: { display: "flex", fontSize: Math.round(width * 0.06), fontWeight: 800, color: textColor, marginTop: Math.round(width * 0.02) } },
        spec.price
      )
    );
  }

  if (spec.cta) {
    const pill = spec.treatment !== "minimal_serif";
    children.push(
      h(
        "div",
        {
          style: {
            display: "flex",
            alignSelf: "flex-start",
            marginTop: Math.round(width * 0.04),
            fontSize: Math.round(width * 0.032),
            fontWeight: 700,
            color: pill ? accentText : palette.accent === palette.primary ? textColor : palette.accent,
            background: pill ? palette.accent : "transparent",
            padding: pill ? `${Math.round(width * 0.016)}px ${Math.round(width * 0.036)}px` : "0",
            borderRadius: pill ? 999 : 0,
            letterSpacing: pill ? "0.02em" : "0.08em",
            textTransform: pill ? "none" : "uppercase",
          },
        },
        spec.cta
      )
    );
  }

  return h(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        fontFamily: fontName,
      },
    },
    l.overImage ? h("div", { style: scrimStyle(zone, dark) }) : null,
    h(
      "div",
      {
        style: {
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: justify,
          alignItems: "stretch",
          padding: `${padTop}px ${pad}px ${padBottom}px ${pad}px`,
        },
      },
      ...children
    )
  );
}

export interface RenderOverlayInput {
  spec: OverlaySpec;
  aspect: ImageFormat;
  palette: OverlayPalette;
  font: { family?: string; fileUrl?: string };
  safeArea?: { top: number; bottom: number };
  overImage?: boolean;
}

/** PNG transparente (solo texto y scrim) con las dimensiones finales del formato. */
export async function renderOverlayPng(input: RenderOverlayInput): Promise<Buffer> {
  const { w: width, h: height } = FINAL_DIMENSIONS[input.aspect];
  const t = TYPOGRAPHIC_TREATMENTS[input.spec.treatment];
  const font = await resolveOverlayFont({
    brandFamily: input.font.family,
    brandFileUrl: input.font.fileUrl,
    fallbackFamily: t.defaultFont.family,
    weight: input.spec.treatment === "minimal_serif" ? 600 : t.defaultFont.weight,
  });
  const tree = renderTree({
    spec: input.spec,
    width,
    height,
    palette: input.palette,
    fontName: font.name,
    safeArea: input.safeArea ?? { top: 0, bottom: 0 },
    overImage: input.overImage ?? true,
  });
  const res = new ImageResponse(tree, {
    width,
    height,
    fonts: [{ name: font.name, data: font.data, weight: font.weight as 600, style: "normal" }],
  });
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Compone el overlay sobre el fondo generado. El fondo se lleva primero a las
 * dimensiones finales exactas. Devuelve JPEG. Si `sharp` no está, devuelve null
 * (la pieza queda con el fondo sin texto y se avisa).
 */
export async function applyOverlay(
  background: Buffer,
  input: RenderOverlayInput
): Promise<{ bytes: Buffer; mimeType: string; width: number; height: number } | null> {
  const { w, h: hh } = FINAL_DIMENSIONS[input.aspect];
  const bg = await finalizeImage(background, { width: w, height: hh });
  if (!bg.resized) {
    const d = readImageDimensions(background);
    if (d.width !== w || d.height !== hh) return null;
  }
  const overlay = await renderOverlayPng(input);
  const out = await compositeOverlay(bg.bytes, overlay);
  if (!out) return null;
  return { ...out, width: w, height: hh };
}
