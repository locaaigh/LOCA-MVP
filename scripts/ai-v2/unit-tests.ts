// Pruebas unitarias (sin red) de la capa NUEVO-v2. Correr: npx tsx scripts/ai-v2/unit-tests.ts
import assert from "node:assert/strict";
import { formatRules, imageFormatFor, aspectFromDimensions, imageMatchesAspect, assertImageMatchesFormat, isPublishable } from "../../src/lib/ai/image/formats";
import { buildImagePrompt } from "../../src/lib/ai/image/prompt-builder";
import { sanitizeStoryText, gateFormat, stripReelsFromMix } from "../../src/lib/ai/shared/validators";
import { readImageDimensions } from "../../src/lib/ai/image/raster";
import { resolveBrandStyle, resolvePieceStyle } from "../../src/lib/ai/image/style-resolver";
import { industryDefaultStyle, STYLE_FAMILIES, SECONDARY_COMPATIBLE } from "../../src/lib/ai/image/style-catalog";
import { routeFor, DEFAULT_ROUTES } from "../../src/lib/ai/image/routing";
import { getAgentConfig } from "../../src/lib/ai/models";
import { estimateImageCostUsd, estimateTextCostUsd } from "../../src/lib/ai/pricing";
import { contentOutputSchema, calendarOutputSchema } from "../../src/lib/ai/shared/schemas";
import type { Business } from "../../src/lib/types";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✗ ${name}\n   ${e instanceof Error ? e.message : e}`);
    process.exitCode = 1;
  }
}

// ── formats ──
test("feed IG/FB → 4:5 1080x1350", () => {
  const r = formatRules("Instagram", "post_estatico");
  assert.equal(r.aspect, "4:5");
  assert.equal(r.width, 1080);
  assert.equal(r.height, 1350);
  assert.equal(r.publishable, true);
});
test("story → 9:16 con safe area 15%", () => {
  const r = formatRules("Facebook", "story");
  assert.equal(r.aspect, "9:16");
  assert.equal(r.height, 1920);
  assert.equal(r.safeArea.top, 0.15);
  assert.equal(r.publishable, false);
});
test("post solo LinkedIn → 1.91:1; con crosspost a IG → 4:5", () => {
  assert.equal(imageFormatFor("LinkedIn", "post_estatico"), "1.91:1");
  assert.equal(imageFormatFor("LinkedIn", "post_estatico", { distribution: ["Instagram"] }), "4:5");
});
test("carrusel → 4:5 y slides 2..8", () => {
  const r = formatRules("Instagram", "carrusel");
  assert.equal(r.aspect, "4:5");
  assert.deepEqual(r.slides, { min: 2, max: 8 });
});
test("proporción real → formato (tolerancia 2%)", () => {
  assert.equal(aspectFromDimensions(1856, 2304), "4:5");
  assert.equal(aspectFromDimensions(1536, 2752), "9:16");
  assert.equal(aspectFromDimensions(1024, 1024), "1:1");
  assert.equal(aspectFromDimensions(1376, 768), null); // 16:9 no es ningún formato de entrega
  assert.equal(imageMatchesAspect(1080, 1350, "4:5"), true);
  assert.equal(imageMatchesAspect(1080, 1080, "4:5"), false);
});
test("assertImageMatchesFormat lanza error claro", () => {
  assert.throws(() => assertImageMatchesFormat({ channel: "Instagram", format: "post_estatico", width: 1080, height: 1920 }), /9:16.*4:5/);
  assert.throws(() => assertImageMatchesFormat({ channel: "Instagram", format: "reel" }), /reel|deshabilitado/i);
  assert.doesNotThrow(() => assertImageMatchesFormat({ channel: "Facebook", format: "post_estatico", width: 1080, height: 1350 }));
  assert.equal(isPublishable("TikTok", "post_estatico"), false);
});

// ── prompt builder ──
test("prompt de 7 capas en orden y sin texto", () => {
  const p = buildImagePrompt({
    concept: "A ceramic cup of coffee on a wooden table, with the text 'Hola' on it.",
    references: { product: 2, person: 0, mascot: 0, productName: "Taza LOCA", productNotes: ["label detail"] },
    noFace: false,
    styleBlock: "Photorealistic photography, 50mm.",
    brand: { primaryHex: "#ec4899", accentHex: "#a3e635", tone: "cercano" },
    localFlavor: true,
    country: "Argentina",
    aspect: "4:5",
    composition: "Vertical 4:5.",
    isStory: false,
    overlay: { zone: "top", fraction: 0.6 },
  });
  const idx = (s: string) => p.indexOf(s);
  assert.ok(!/with the text/i.test(p), "limpia instrucciones de texto del concepto");
  assert.ok(idx("Image 1 is the client's real product (Taza LOCA)") > 0);
  assert.ok(idx("Image 2: label detail") > 0);
  assert.ok(idx("Style:") > idx("Image 1"));
  assert.ok(idx("Brand colors: #ec4899 as the dominant tone") > idx("Style:"));
  assert.ok(idx("Argentine / Latin American") > idx("Brand colors"));
  assert.ok(idx("Format: 4:5 vertical") > idx("Argentine"));
  assert.ok(idx("upper third") > 0 && idx("60%") > 0);
  assert.ok(p.trim().endsWith("single coherent scene."));
});
test("profesional sin foto → composición sin rostro", () => {
  const p = buildImagePrompt({ concept: "Owner working", references: { product: 0, person: 0, mascot: 0 }, noFace: true, styleBlock: "x", brand: {}, localFlavor: false, aspect: "9:16", composition: "c", isStory: true });
  assert.ok(/without a protagonist face/.test(p));
  assert.ok(/top and bottom 15%/.test(p));
});

// ── validators ──
test("story: se limpian frases interactivas", () => {
  const r = sanitizeStoryText("Mirá el nuevo menú. Respondé la encuesta y deslizá hacia arriba para ver más. Te esperamos.");
  assert.equal(r.text, "Mirá el nuevo menú. Te esperamos.");
  assert.ok(r.hits.includes("encuesta"));
  assert.ok(r.hits.includes("deslizá hacia arriba"));
});
test("story: texto sin problemas no cambia", () => {
  const r = sanitizeStoryText("Nuevo horario de verano. Respondeme por mensaje si querés reservar.");
  assert.equal(r.hits.length, 0);
});
test("reel → post_estatico (bloqueado)", () => {
  assert.deepEqual(gateFormat("reel"), { format: "post_estatico", blocked: "reel" });
  assert.deepEqual(gateFormat("carrusel"), { format: "post_estatico", blocked: "carrusel" });
  assert.deepEqual(gateFormat("story"), { format: "story" });
});
test("mix sin reels renormaliza a 100", () => {
  const { mix, removed } = stripReelsFromMix([{ type: "Reels", percentage: 40 }, { type: "Posts", percentage: 30 }, { type: "Stories", percentage: 30 }]);
  assert.equal(removed, true);
  assert.equal(mix.reduce((a, m) => a + m.percentage, 0), 100);
});

// ── raster ──
test("dimensiones PNG/JPEG desde cabecera", () => {
  const png = Buffer.from("89504e470d0a1a0a0000000d49484452000004380000054600", "hex");
  assert.deepEqual(readImageDimensions(png), { width: 1080, height: 1350, type: "png" });
  const jpeg = Buffer.from("ffd8ffe000104a46494600010100000100010000ffc0000b0800f00140010122000000", "hex");
  const d = readImageDimensions(jpeg);
  assert.equal(d.type, "jpeg");
  assert.equal(d.width, 320);
  assert.equal(d.height, 240);
});

// ── estilos ──
const biz = (over: Partial<Business>): Business =>
  ({
    id: "b1", name: "Café Lía", industry: "Food & Beverage", subcategory: "Café", businessType: "Local físico", businessModel: "B2C",
    country: "Argentina", city: "Rosario", state: "Santa Fe", shortDescription: "", fullDescription: "", values: [], competitiveAdvantages: [],
    marketingChannels: ["Instagram"], seasonality: "", seasonalityTags: [], specialDates: [], brandColors: [], productsServices: [],
    audience: { ageRanges: [], gender: "todos", locationLogic: "ciudad", locations: [], socioeconomicLevel: "medio", painPoints: [], behavior: "", segments: [] },
    goals: { primaryContentGoal: "ventas", businessObjectives: "", successMetrics: [], marketingObjectives: "", timeline: "" },
    onboardingComplete: true, createdAt: "", updatedAt: "", marketingActivities: [],
    ...over,
  }) as unknown as Business;
test("default por industria: gastronomía → fotografía food", () => {
  const s = resolveBrandStyle(biz({}));
  assert.equal(s.primaryFamily, "fotografia");
  assert.equal(s.primaryVariant, "food_retail_saturado");
  assert.equal(s.source, "industry_default");
  assert.equal(industryDefaultStyle("Tech & Software Startups").family, "render_3d");
  assert.equal(industryDefaultStyle("Professional Services").variant, "monocromo_b2b");
});
test("visualStyles viejos → familia (legacy)", () => {
  const s = resolveBrandStyle(biz({ visualStyles: ["cartoon_anime", "minimalista_tipografico"] }));
  assert.equal(s.primaryFamily, "cartoon");
  assert.equal(s.typographicSystem, "minimal_serif");
  assert.equal(s.source, "legacy_visual_styles");
});
test("brand kit con familia secundaria incompatible se descarta", () => {
  const b = biz({ brandKit: { colors: { palette: [] }, typography: {}, logos: [], visualStyle: { mood: [] }, voiceTone: { toneTags: [] }, style: { primaryFamily: "cartoon", secondaryFamily: "cinematografico", typographicSystem: "promo" } } });
  const s = resolveBrandStyle(b);
  assert.equal(s.primaryFamily, "cartoon");
  assert.equal(s.secondaryFamily, undefined);
  assert.equal(s.typographicSystem, "promo");
});
test("propósito decide tipográfico vs familia; rotación 70/30", () => {
  const b = biz({ brandKit: { colors: { palette: [] }, typography: {}, logos: [], visualStyle: { mood: [] }, voiceTone: { toneTags: [] }, style: { primaryFamily: "fotografia", primaryVariant: "lifestyle", typographicSystem: "bold_oversized" } } });
  assert.equal(resolvePieceStyle(b, "educativo").usesTypographic, true);
  assert.equal(resolvePieceStyle(b, "educativo").family, "tipografico");
  assert.equal(resolvePieceStyle(b, "venta").usesTypographic, false);
  assert.equal(resolvePieceStyle(b, "fecha_especial").headlineOverlay, true);
  const variants = Array.from({ length: 10 }, (_, i) => resolvePieceStyle(b, "venta", i).variant?.id);
  assert.equal(variants.filter((v) => v === "lifestyle").length, 7);
  assert.ok(variants.slice(7).every((v) => v !== "lifestyle"));
});
test("catálogo: 8 familias, pares compatibles simétricos donde corresponde", () => {
  assert.equal(Object.keys(STYLE_FAMILIES).length, 8);
  assert.ok(SECONDARY_COMPATIBLE.fotografia.includes("cinematografico"));
  assert.ok(!SECONDARY_COMPATIBLE.cartoon.includes("cinematografico"));
});

// ── ruteo ──
test("ruteo: gemini-only por defecto (adaptación LOCA) y matriz si se fuerza", () => {
  // ADAPTACIÓN LOCA: default gemini-only → nuestro modelo gemini-3-pro-image, sin OpenAI.
  delete process.env.AI_IMAGE_ROUTING;
  const r = routeFor("product_reference", { openai: true, gemini: true });
  assert.equal(r.primary.provider, "gemini");
  assert.equal(r.primary.model, "gemini-3-pro-image");
  assert.equal(routeFor("artistic", { openai: true, gemini: true }).primary.model, "gemini-3-pro-image");
  // La matriz original de Sebi sigue disponible si se fuerza por env.
  process.env.AI_IMAGE_ROUTING = "matrix";
  assert.equal(routeFor("product_reference", { openai: true, gemini: true }).primary.model, "gpt-image-2.5-sunburst");
  // Disponibilidad: sin key de OpenAI, cae a gemini aun en matrix.
  assert.equal(routeFor("product_reference", { openai: false, gemini: true }).primary.provider, "gemini");
  delete process.env.AI_IMAGE_ROUTING;
  assert.equal(Object.keys(DEFAULT_ROUTES).length, 10);
});

// ── modelos y precios ──
test("modelo por agente con override por env", () => {
  // ADAPTACIÓN LOCA: todos los agentes usan claude-sonnet-4-6 + temperature.
  assert.equal(getAgentConfig("strategy").model, "claude-sonnet-4-6");
  assert.equal(getAgentConfig("content").model, "claude-sonnet-4-6");
  assert.equal(getAgentConfig("content").temperature, 0.9);
  process.env.AI_MODEL_CONTENT = "claude-haiku-4-5";
  process.env.AI_TEMPERATURE_CONTENT = "0.3";
  assert.equal(getAgentConfig("content").model, "claude-haiku-4-5");
  assert.equal(getAgentConfig("content").temperature, 0.3);
  delete process.env.AI_MODEL_CONTENT;
  delete process.env.AI_TEMPERATURE_CONTENT;
});
test("precios por tier / quality / referencias", () => {
  assert.equal(estimateImageCostUsd("gemini-nano-banana-2.1", { sizeTier: "2K" }), 0.0504);
  assert.ok(Math.abs(estimateImageCostUsd("gemini-nano-banana-2.1", { sizeTier: "2K", referenceCount: 3 }) - 0.0537) < 1e-6);
  assert.equal(estimateImageCostUsd("gpt-image-2.5-sunburst", { quality: "high" }), 0.053);
  assert.equal(estimateImageCostUsd("gemini-3-pro-image", { sizeTier: "2K" }), 0.134);
  assert.ok(Math.abs(estimateTextCostUsd("claude-sonnet-5-5", { inputTokens: 1000, outputTokens: 1000, cacheReadTokens: 10000 }) - 0.014) < 1e-9);
});

// ── schemas ──
test("schema de contenido: overlay opcional, visualConcept obligatorio", () => {
  const ok = contentOutputSchema.safeParse({ title: "t", caption: "c", hook: "h", body: "", cta: "cta", visualConcept: "A cup of coffee on a table", overlay: null });
  assert.ok(ok.success);
  const bad = contentOutputSchema.safeParse({ title: "t", caption: "c", hook: "h", cta: "cta", visualConcept: "short" });
  assert.ok(!bad.success);
});
test("schema de calendario: purpose inválido cae a 'marca'", () => {
  const r = calendarOutputSchema.safeParse({ items: [{ dayOffset: 3, channel: "Instagram", format: "post_estatico", contentPillar: "p", topic: "t", purpose: "lo-que-sea" }] });
  assert.ok(r.success && r.data.items[0].purpose === "marca");
});

console.log(`\n${passed} pruebas OK${process.exitCode ? " (con fallos)" : ""}`);
