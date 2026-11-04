// Verifica con llamadas REALES (centavos) que los modelos de imagen de la matriz existen y
// devuelven la proporción pedida. Correr con las keys en el entorno:
//   node --env-file=.env.local scripts/ai-v2/verify-image-models.mjs
// Sin OPENAI_API_KEY válida, la parte de OpenAI se salta y lo dice.
import fs from "node:fs";

const OUT = process.argv[2] || ".verify-out";
fs.mkdirSync(OUT, { recursive: true });

function dims(buf) {
  if (buf[0] === 0x89 && buf[1] === 0x50) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), type: "png" };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const m = buf[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7), type: "jpeg" };
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return { type: "unknown" };
}
const ratioOk = (d, expected, tol = 0.02) => d.w && Math.abs(d.w / d.h - expected) / expected <= tol;
const PROMPT = "A ceramic cup of coffee on a wooden table in a neighborhood café, soft morning light, photorealistic. No text, no logos.";
const results = [];

// ── Anthropic: modelos de texto ──
if (process.env.ANTHROPIC_API_KEY) {
  const r = await fetch("https://api.anthropic.com/v1/models?limit=100", { headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" } });
  const ids = ((await r.json()).data || []).map((m) => m.id);
  for (const id of ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"]) results.push({ check: `anthropic ${id}`, ok: ids.includes(id) });
} else results.push({ check: "anthropic", ok: false, note: "sin ANTHROPIC_API_KEY" });

// ── Gemini ──
if (process.env.GEMINI_API_KEY) {
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const list = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${process.env.GEMINI_API_KEY}`).then((r) => r.json());
  const ids = (list.models || []).map((m) => m.name.replace("models/", ""));
  for (const id of ["gemini-nano-banana-2.1", "gemini-3.1-flash-image"]) results.push({ check: `gemini modelo ${id}`, ok: ids.includes(id) });
  for (const [aspect, expected] of [["4:5", 0.8], ["9:16", 9 / 16]]) {
    try {
      const t0 = Date.now();
      const res = await ai.models.generateContent({ model: "gemini-nano-banana-2.1", contents: PROMPT, config: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: aspect, imageSize: "2K" } } });
      const p = (res.candidates?.[0]?.content?.parts || []).find((x) => x.inlineData);
      const buf = Buffer.from(p.inlineData.data, "base64");
      const d = dims(buf);
      fs.writeFileSync(`${OUT}/gemini-${aspect.replace(":", "x")}.jpg`, buf);
      results.push({ check: `gemini nano-banana-2.1 ${aspect} 2K`, ok: ratioOk(d, expected), note: `${d.w}x${d.h} ${Date.now() - t0}ms` });
    } catch (e) { results.push({ check: `gemini ${aspect}`, ok: false, note: String(e.message).slice(0, 200) }); }
  }
} else results.push({ check: "gemini", ok: false, note: "sin GEMINI_API_KEY" });

// ── OpenAI (Sunburst / Flare) ──
if (process.env.OPENAI_API_KEY) {
  const H = { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" };
  const list = await fetch("https://api.openai.com/v1/models", { headers: H });
  if (list.status === 401) results.push({ check: "openai", ok: false, note: "OPENAI_API_KEY inválida (401)" });
  else {
    const ids = ((await list.json()).data || []).map((m) => m.id);
    for (const id of ["gpt-image-2.5-sunburst", "gpt-image-2.5-flare"]) results.push({ check: `openai modelo ${id}`, ok: ids.includes(id), note: ids.includes(id) ? "" : "no aparece en /v1/models (puede igual funcionar: probar abajo)" });
    for (const [model, size, expected] of [["gpt-image-2.5-flare", "1088x1360", 0.8], ["gpt-image-2.5-flare", "1152x2048", 9 / 16], ["gpt-image-2.5-sunburst", "1088x1360", 0.8]]) {
      try {
        const t0 = Date.now();
        const r = await fetch("https://api.openai.com/v1/images/generations", { method: "POST", headers: H, body: JSON.stringify({ model, prompt: PROMPT, size, quality: "low", n: 1, output_format: "jpeg" }) });
        const j = await r.json();
        if (!r.ok) throw new Error(`${r.status} ${j.error?.code || ""} ${j.error?.message || ""}`);
        const buf = Buffer.from(j.data[0].b64_json, "base64");
        const d = dims(buf);
        fs.writeFileSync(`${OUT}/${model}-${size}.jpg`, buf);
        results.push({ check: `openai ${model} ${size} (quality low)`, ok: ratioOk(d, expected), note: `${d.w}x${d.h} ${Date.now() - t0}ms usage=${JSON.stringify(j.usage || {})}` });
      } catch (e) { results.push({ check: `openai ${model} ${size}`, ok: false, note: String(e.message).slice(0, 200) }); }
    }
    // edits con referencia (multipart image[])
    try {
      const refPath = `${OUT}/gemini-4x5.jpg`;
      if (fs.existsSync(refPath)) {
        const form = new FormData();
        form.append("model", "gpt-image-2.5-sunburst");
        form.append("prompt", "Image 1 is the client's product. Keep its exact shape and colors; new background: a marble counter, soft light. No text.");
        form.append("size", "1088x1360");
        form.append("quality", "low");
        form.append("output_format", "jpeg");
        form.append("image[]", new Blob([fs.readFileSync(refPath)], { type: "image/jpeg" }), "ref-1.jpg");
        const r = await fetch("https://api.openai.com/v1/images/edits", { method: "POST", headers: { Authorization: H.Authorization }, body: form });
        const j = await r.json();
        if (!r.ok) throw new Error(`${r.status} ${j.error?.code || ""} ${j.error?.message || ""}`);
        const d = dims(Buffer.from(j.data[0].b64_json, "base64"));
        results.push({ check: "openai sunburst /edits con 1 referencia", ok: ratioOk(d, 0.8), note: `${d.w}x${d.h} usage=${JSON.stringify(j.usage || {})}` });
      }
    } catch (e) { results.push({ check: "openai /edits", ok: false, note: String(e.message).slice(0, 200) }); }
  }
} else results.push({ check: "openai", ok: false, note: "sin OPENAI_API_KEY: Sunburst/Flare no verificados; usar AI_IMAGE_ROUTING=gemini-only" });

for (const r of results) console.log(`${r.ok ? "✓" : "✗"} ${r.check}${r.note ? ` — ${r.note}` : ""}`);
console.log(`\nSalidas en ${OUT}`);
