// ─────────────────────────────────────────────────────────────
// Pack de contenidos (.zip) para publicar manualmente.
// Por pieza: imagen + .txt con el copy estructurado, nombrados igual.
// Más un _resumen.csv índice. Ver PLAN-v2 (export de contenidos).
// ─────────────────────────────────────────────────────────────
import JSZip from "jszip";
import type { Business, ContentItem } from "./types";
import { FORMAT_LABELS } from "./constants";

function slug(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

function extFromMime(mime: string): string {
  if (/png/i.test(mime)) return "png";
  if (/jpe?g/i.test(mime)) return "jpg";
  if (/webp/i.test(mime)) return "webp";
  if (/svg/i.test(mime)) return "svg";
  return "jpg";
}

async function imageToBlob(imageUrl?: string): Promise<{ blob: Blob; ext: string } | null> {
  if (!imageUrl) return null;
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    return { blob, ext: extFromMime(blob.type || "") };
  } catch {
    return null;
  }
}

function fmtDate(dateIso?: string): string {
  if (!dateIso) return "";
  try {
    return new Date(dateIso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return dateIso;
  }
}

function copyText(c: ContentItem, dateIso: string): string {
  const when = [fmtDate(dateIso), c.scheduledTime].filter(Boolean).join(" · ");
  const lines = [
    `Fecha: ${when || "sin fecha"}`,
    `Red: ${c.channel} · Formato: ${FORMAT_LABELS[c.format] || c.format}`,
    "────────────────────",
    "",
  ];
  if (c.title) lines.push(`TÍTULO: ${c.title}`, "");
  if (c.hook) lines.push(`HOOK: ${c.hook}`, "");
  lines.push("COPY:", c.caption || "", "");
  if (c.cta) lines.push(`CTA: ${c.cta}`);
  return lines.join("\n").trim() + "\n";
}

function csvCell(v: string): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export interface ContentPackItem {
  content: ContentItem;
  /** Fecha efectiva de la pieza (programada / calendario / creación). */
  date: string;
}

/**
 * Arma y descarga un .zip con las piezas: imagen + copy .txt + _resumen.csv.
 * Devuelve la cantidad de piezas incluidas.
 */
export async function exportContentPack(
  business: Business,
  items: ContentPackItem[]
): Promise<number> {
  const zip = new JSZip();
  const used = new Set<string>();
  const csvRows: string[] = [["archivo", "fecha", "red", "formato", "titulo", "copy"].join(",")];

  for (const { content: c, date } of items) {
    // Nombre base único: fecha_red_formato
    let base = `${(date || c.createdAt).slice(0, 10)}_${slug(c.channel)}_${slug(c.format)}`;
    let name = base;
    let n = 2;
    while (used.has(name)) name = `${base}-${n++}`;
    used.add(name);

    // Copy .txt
    zip.file(`${name}.txt`, copyText(c, date));

    // Imagen (best-effort: si no se puede bajar, igual queda el .txt)
    const img = await imageToBlob(c.imageUrl);
    if (img) zip.file(`${name}.${img.ext}`, img.blob);

    csvRows.push(
      [
        csvCell(img ? `${name}.${img.ext}` : `${name}.txt`),
        csvCell(fmtDate(date)),
        csvCell(c.channel),
        csvCell(FORMAT_LABELS[c.format] || c.format),
        csvCell(c.title),
        csvCell(c.caption),
      ].join(",")
    );
  }

  zip.file("_resumen.csv", "﻿" + csvRows.join("\n"));

  const blob = await zip.generateAsync({ type: "blob" });
  triggerDownload(blob, `contenidos-${slug(business.name) || "loca"}.zip`);
  return items.length;
}
