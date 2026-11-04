// Prueba de fuego con IA REAL (gasta centavos): estrategia → calendario → 3 piezas → imágenes
// con referencia de producto, overlay de texto y story, + regla "sin rostro" del profesional.
// Correr: npx tsx scripts/ai-v2/smoke-pipeline.ts [carpeta-de-salida]
import fs from "node:fs";
import path from "node:path";

// .env.local sin dependencias
for (const line of fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8").split("\n") : []) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
}

import { DEMO_BUSINESSES } from "../../src/lib/demo";
import { strategyAgent, calendarAgent, contentAgent, imageAgent } from "../../src/lib/ai/agents";
import { mockContent } from "../../src/lib/ai/mock";
import { geminiImageProvider } from "../../src/lib/ai/providers/gemini-image";
import { toDataUrl } from "../../src/lib/ai/image/raster";
import type { Business, CalendarItem, ContentItem } from "../../src/lib/types";

const OUT = process.argv[2] || path.join(process.cwd(), ".smoke-out");
fs.mkdirSync(OUT, { recursive: true });
let totalCost = 0;
const log = (...a: unknown[]) => console.log(...a);

async function main() {
  const base = structuredClone(DEMO_BUSINESSES[0]) as Business;
  base.personPhotos = [];

  // 0) Foto de "producto" de referencia (simula la que sube el cliente)
  log("\n[0] Generando foto de referencia del producto (Gemini)…");
  const ref = await geminiImageProvider.generate({
    prompt: "Clean studio product photo of a 250g bag of specialty coffee beans in kraft paper with a plain dark green label area without any text, soft diffused light, plain light background, centered.",
    aspect: "1:1",
    model: "gemini-nano-banana-2.1",
    sizeTier: "1K",
  });
  fs.writeFileSync(path.join(OUT, "00-referencia-producto.jpg"), ref.bytes);
  totalCost += 0.0336;
  const product = base.productsServices.find((p) => p.type === "producto") ?? base.productsServices[0];
  product.isTopSeller = true;
  product.photos = [{ id: "ph1", label: "frontal", kind: "product", dataUrl: toDataUrl(ref.bytes, ref.mimeType), createdAt: new Date().toISOString() }];
  log(`   producto con foto: ${product.name}`);

  // 1) Estrategia (Opus 5.5)
  log("\n[1] Estrategia…");
  const s = await strategyAgent.run({ business: base });
  totalCost += s.meta.usage?.costUsd ?? 0;
  log(`   provider=${s.meta.provider} model=${s.meta.model} ${s.meta.durationMs}ms $${s.meta.usage?.costUsd?.toFixed(4)} repaired=${!!s.meta.repaired} warning=${s.meta.warning ?? "-"}`);
  log(`   ángulo: ${s.data.mainAngle}`);
  log(`   mix: ${s.data.contentMix.map((m) => `${m.type} ${m.percentage}%`).join(", ")}`);
  log(`   canales: ${s.data.recommendedChannels.join(", ")}`);

  // 2) Calendario con brief por pieza (Sonnet 5.5)
  log("\n[2] Calendario (6 piezas)…");
  const cal = await calendarAgent.run({ business: base, strategy: s.data, count: 6 });
  totalCost += cal.meta.usage?.costUsd ?? 0;
  log(`   provider=${cal.meta.provider} ${cal.meta.durationMs}ms $${cal.meta.usage?.costUsd?.toFixed(4)} warning=${cal.meta.warning ?? "-"}`);
  for (const it of cal.data) log(`   ${it.date} ${it.channel.padEnd(9)} ${it.format.padEnd(13)} ${String(it.purpose).padEnd(14)} ${it.topic} | hook: ${it.hookIdea}`);

  // 3) Tres piezas: producto/venta, educativo o promo (overlay), story
  const pickItem = (pred: (i: CalendarItem) => boolean, fallback: Partial<CalendarItem>): CalendarItem =>
    cal.data.find(pred) ?? { ...cal.data[0], ...fallback };
  const items: CalendarItem[] = [
    pickItem((i) => (i.purpose === "venta" || i.purpose === "producto") && i.format !== "story", { purpose: "producto", format: "post_estatico" }),
    pickItem((i) => (i.purpose === "educativo" || i.purpose === "promo") && i.format !== "story", { purpose: "promo", format: "post_estatico", needsTextOverlay: true }),
    pickItem((i) => i.format === "story", { format: "story", purpose: "promo", needsTextOverlay: true, channel: "Instagram" }),
  ];
  const hooks: string[] = [];
  const contents: ContentItem[] = [];
  for (const [i, item] of items.entries()) {
    log(`\n[3.${i + 1}] Contenido (${item.format} / ${item.purpose})…`);
    const c = await contentAgent.run({ business: base, strategy: s.data, calendarItem: item, previousHooks: hooks });
    totalCost += c.meta.usage?.costUsd ?? 0;
    hooks.push(c.data.hook);
    log(`   provider=${c.meta.provider} ${c.meta.durationMs}ms $${c.meta.usage?.costUsd?.toFixed(4)} cacheRead=${c.meta.usage ? (c.meta.usage as { cacheReadTokens?: number }).cacheReadTokens : "-"} repaired=${!!c.meta.repaired} isMock=${c.data.isMock}`);
    log(`   hook: ${c.data.hook}`);
    log(`   caption: ${c.data.caption.slice(0, 160).replace(/\n/g, " ")}…`);
    log(`   visualConcept: ${c.data.visualConcept}`);
    log(`   overlay: ${JSON.stringify(c.data.overlay)}`);
    contents.push(c.data);
  }

  // 4) Imágenes
  for (const [i, c] of contents.entries()) {
    log(`\n[4.${i + 1}] Imagen ${c.format} ${c.imageFormat} (${c.purpose})…`);
    const r = await imageAgent.run({ business: base, content: c, pieceIndex: i });
    totalCost += r.data.generation.costUsd;
    const g = r.data.generation;
    log(`   status=${r.data.status} useCase=${g.useCase} family=${g.family}/${g.variant ?? "-"} model=${g.model} overlay=${g.overlayApplied} refs=${JSON.stringify(g.references)} ${g.width}x${g.height} $${g.costUsd.toFixed(4)} ${r.meta.durationMs}ms`);
    log(`   intentos: ${g.attempts.map((a) => `${a.model}:${a.outcome}${a.detail ? `(${a.detail.slice(0, 80)})` : ""}`).join(" → ")}`);
    log(`   qa: ${JSON.stringify(g.qa?.checks)} issues=${JSON.stringify(g.qa?.issues)}`);
    log(`   eventos: ${g.events.map((e) => e.name).join(", ") || "-"} | warnings: ${r.data.warnings.join(" | ") || "-"}`);
    if (r.data.status === "generada" && r.data.imageUrl.startsWith("data:")) {
      const b64 = r.data.imageUrl.split(",")[1];
      fs.writeFileSync(path.join(OUT, `0${i + 1}-${c.format}-${c.purpose}.jpg`), Buffer.from(b64, "base64"));
    } else log(`   ERROR: ${r.data.error}`);
    fs.writeFileSync(path.join(OUT, `0${i + 1}-prompt.txt`), g.prompt);
  }

  // 5) Profesional independiente SIN foto → sin rostro
  log("\n[5] Profesional independiente sin foto propia (regla dura)…");
  const pro: Business = {
    ...structuredClone(base),
    name: "Lic. Sofía Paz",
    industry: "Health & Wellness",
    subcategory: "Nutrición",
    businessType: "Marca personal",
    businessStage: "profesional_independiente",
    personPhotos: [],
    productsServices: [{ ...base.productsServices[0], type: "servicio", name: "Plan nutricional personalizado", photos: [] }],
    visualStyles: ["fotorrealista"],
  };
  const proItem: CalendarItem = { ...items[0], purpose: "equipo", format: "post_estatico", channel: "Instagram", topic: "Conocé a Sofía", visualConcept: "" };
  const proContent: ContentItem = {
    ...mockContent(pro, s.data, proItem),
    purpose: "equipo",
    imageStatus: "pendiente",
    visualConcept: "The nutritionist smiling at the camera at her consultation desk, warm natural light, plants, a notebook with a meal plan.",
    imagePrompt: "",
  };
  const pr = await imageAgent.run({ business: pro, content: proContent, pieceIndex: 0 });
  totalCost += pr.data.generation.costUsd;
  const pg = pr.data.generation;
  log(`   status=${pr.data.status} useCase=${pg.useCase} model=${pg.model} eventos=${pg.events.map((e) => e.name).join(", ")}`);
  log(`   intentos: ${pg.attempts.map((a) => `${a.model}:${a.outcome}${a.detail ? `(${a.detail.slice(0, 80)})` : ""}`).join(" → ")}`);
  log(`   qa: ${JSON.stringify(pg.qa?.checks)}`);
  log(`   prompt incluye "without a protagonist face": ${/without a protagonist face/.test(pg.prompt)}`);
  if (pr.data.status === "generada") fs.writeFileSync(path.join(OUT, "05-profesional-sin-rostro.jpg"), Buffer.from(pr.data.imageUrl.split(",")[1], "base64"));
  else log(`   ERROR: ${pr.data.error}`);

  log(`\nCosto total estimado: $${totalCost.toFixed(4)} · salidas en ${OUT}`);
}

main().catch((e) => {
  console.error("FALLÓ:", e);
  process.exit(1);
});
