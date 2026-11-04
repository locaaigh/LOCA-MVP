// Prueba corta con IA real: (a) pieza educativa con overlay (fondo tipográfico + texto envuelto),
// (b) profesional sin foto con concepto que tienta a dibujar texto (reintento adaptativo).
import fs from "node:fs";
import path from "node:path";
for (const line of fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8").split("\n") : []) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
}
import { DEMO_BUSINESSES } from "../../src/lib/demo";
import { imageAgent } from "../../src/lib/ai/agents";
import { mockContent, mockStrategy } from "../../src/lib/ai/mock";
import type { Business, CalendarItem, ContentItem } from "../../src/lib/types";

const OUT = process.argv[2] || ".smoke-out";
fs.mkdirSync(OUT, { recursive: true });

async function main() {
  const base = structuredClone(DEMO_BUSINESSES[0]) as Business;
  base.personPhotos = [];
  const strategy = mockStrategy(base);
  const item: CalendarItem = {
    id: "c1", businessId: base.id, strategyId: strategy.id, date: "2026-11-01", suggestedTime: "18:00", channel: "Instagram",
    format: "post_estatico", contentPillar: "Educativo", objective: "Engagement", topic: "V60 vs Chemex", purpose: "educativo",
    needsTextOverlay: true, status: "generado", createdAt: "", updatedAt: "",
  };
  const edu: ContentItem = {
    ...mockContent(base, strategy, item),
    purpose: "educativo",
    imageStatus: "pendiente",
    visualConcept: "A single ceramic cup of filtered coffee placed in the lower right corner on a plain warm cream surface, soft side light, most of the frame empty.",
    imagePrompt: "",
    overlay: { treatment: "minimal_serif", headline: "V60 o Chemex: ¿cuál va con vos y con tu mañana?", subheadline: "V60: más intenso y con carácter. Chemex: más suave y limpio.", cta: "Escribinos por mensaje", zone: "bottom" },
  };
  console.log("\n[A] Educativo con overlay…");
  const a = await imageAgent.run({ business: base, content: edu, pieceIndex: 1 });
  const ga = a.data.generation;
  console.log(`   status=${a.data.status} useCase=${ga.useCase} family=${ga.family} overlay=${ga.overlayApplied} intentos=${ga.attempts.map((x) => `${x.model}:${x.outcome}`).join(" → ")} $${ga.costUsd.toFixed(4)} ${a.meta.durationMs}ms`);
  console.log(`   qa=${JSON.stringify(ga.qa?.checks)}`);
  if (a.data.status === "generada") fs.writeFileSync(path.join(OUT, "A-educativo-overlay.jpg"), Buffer.from(a.data.imageUrl.split(",")[1], "base64"));

  const pro: Business = {
    ...structuredClone(base), name: "Lic. Sofía Paz", industry: "Health & Wellness", subcategory: "Nutrición", businessType: "Marca personal",
    businessStage: "profesional_independiente", personPhotos: [], visualStyles: ["fotorrealista"],
    productsServices: [{ ...base.productsServices[0], type: "servicio", name: "Plan nutricional personalizado", photos: [] }],
  };
  const proContent: ContentItem = {
    ...mockContent(pro, strategy, { ...item, purpose: "equipo", topic: "Conocé a Sofía" }),
    purpose: "equipo",
    imageStatus: "pendiente",
    visualConcept: "The nutritionist at her consultation desk writing a meal plan in a notebook, warm natural light, plants on the desk.",
    imagePrompt: "",
    overlay: undefined,
  };
  console.log("\n[B] Profesional sin foto, concepto con cuaderno (reintento adaptativo)…");
  const b = await imageAgent.run({ business: pro, content: proContent, pieceIndex: 0 });
  const gb = b.data.generation;
  console.log(`   status=${b.data.status} useCase=${gb.useCase} intentos=${gb.attempts.map((x) => `${x.model}:${x.outcome}${x.detail ? `(${x.detail.slice(0, 60)})` : ""}`).join(" → ")} $${gb.costUsd.toFixed(4)} ${b.meta.durationMs}ms`);
  console.log(`   qa=${JSON.stringify(gb.qa?.checks)} eventos=${gb.events.map((e) => e.name).join(",")}`);
  console.log(`   prompt tiene nota de reintento: ${/fix from the previous attempt/.test(gb.prompt)}`);
  if (b.data.status === "generada") fs.writeFileSync(path.join(OUT, "B-profesional-sin-rostro.jpg"), Buffer.from(b.data.imageUrl.split(",")[1], "base64"));
  else console.log("   ERROR:", b.data.error);
}
main().catch((e) => { console.error("FALLÓ:", e); process.exit(1); });
