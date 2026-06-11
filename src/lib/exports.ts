"use client";

import type { Business, CalendarItem, ContentItem, Strategy } from "./types";
import { downloadFile, toCsv } from "./utils";
import { FORMAT_LABELS, CONTENT_STATUS_LABELS, PUBLISH_STATUS_LABELS } from "./constants";

export function exportCalendarCsv(business: Business, items: CalendarItem[]) {
  const rows = items.map((it) => ({
    fecha: it.date,
    hora: it.suggestedTime,
    canal: it.channel,
    formato: FORMAT_LABELS[it.format] || it.format,
    pilar: it.contentPillar,
    objetivo: it.objective,
    tema: it.topic,
    estado: it.status,
  }));
  downloadFile(`calendario-${slug(business.name)}.csv`, toCsv(rows), "text/csv;charset=utf-8");
}

export function exportContentsCsv(business: Business, items: ContentItem[]) {
  const rows = items.map((c) => ({
    titulo: c.title,
    canal: c.channel,
    formato: FORMAT_LABELS[c.format] || c.format,
    pilar: c.contentPillar,
    objetivo: c.objective,
    hook: c.hook,
    caption: c.caption,
    cta: c.cta,
    hashtags: c.hashtags.join(" "),
    concepto_visual: c.visualConcept,
    prompt_imagen: c.imagePrompt,
    estado: CONTENT_STATUS_LABELS[c.status] || c.status,
    publicacion: PUBLISH_STATUS_LABELS[c.publishStatus] || c.publishStatus,
  }));
  downloadFile(`contenidos-${slug(business.name)}.csv`, toCsv(rows), "text/csv;charset=utf-8");
}

export function exportStrategyHtml(business: Business, s: Strategy) {
  const html = strategyHtml(business, s);
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
    return;
  }
  // fallback: descargar archivo
  downloadFile(`estrategia-${slug(business.name)}.html`, html, "text/html");
}

function li(arr: string[]) {
  return arr.map((x) => `<li>${esc(x)}</li>`).join("");
}

function strategyHtml(b: Business, s: Strategy): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<title>Estrategia — ${esc(b.name)}</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#18181b;line-height:1.5}
  h1{color:#db2777} h2{color:#9d174d;margin-top:28px;border-bottom:2px solid #fce7f3;padding-bottom:4px}
  .tag{display:inline-block;background:#fce7f3;color:#be185d;border-radius:999px;padding:2px 10px;margin:2px;font-size:13px}
  .lima{background:#ecfccb;color:#4d7c0f}
  ul{margin:6px 0} .muted{color:#71717a}
  @media print{body{margin:0}}
</style></head><body>
<h1>Estrategia de marketing — ${esc(b.name)}</h1>
<p class="muted">${esc(b.industry)} · ${esc(b.city || b.country)} · Generado por Eva (LOCA)</p>
<h2>Resumen del negocio</h2><p>${esc(s.businessSummary)}</p>
<h2>Posicionamiento de marca</h2><p>${esc(s.brandPositioning)}</p>
<h2>Audiencia</h2><p>${esc(s.audienceSummary)}</p>
<h2>Ángulo principal</h2><p>${esc(s.mainAngle)}</p>
<h2>Pilares de contenido</h2>
${s.contentPillars.map((p) => `<p><strong>${esc(p.name)}:</strong> ${esc(p.description)}</p>`).join("")}
<h2>Tono de voz</h2><p>${esc(s.toneOfVoice)}</p>
<h2>Canales recomendados</h2><p>${s.recommendedChannels.map((c) => `<span class="tag">${esc(c)}</span>`).join("")}</p>
<h2>Objetivo mensual</h2><p>${esc(s.monthlyGoal)}</p>
<h2>CTA recomendado</h2><p><span class="tag lima">${esc(s.recommendedCta)}</span></p>
<h2>Ideas de ofertas</h2><ul>${li(s.offerIdeas)}</ul>
<h2>Mensajes clave</h2><ul>${li(s.keyMessages)}</ul>
<h2>Mix de contenidos</h2><ul>${s.contentMix.map((m) => `<li>${esc(m.type)}: ${m.percentage}%</li>`).join("")}</ul>
<h2>Do's</h2><ul>${li(s.dos)}</ul>
<h2>Don'ts</h2><ul>${li(s.donts)}</ul>
<h2>Próximas acciones</h2><ul>${li(s.nextActions)}</ul>
<p class="muted" style="margin-top:40px">LOCA — Humanless marketing.</p>
<script>setTimeout(()=>window.print(),400)</script>
</body></html>`;
}

function esc(s: string): string {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function slug(s: string): string {
  return (s || "loca").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
