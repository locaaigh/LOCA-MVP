// ─────────────────────────────────────────────────────────────
// "Que Eva elija por mí": propone una identidad visual inicial según
// industria / tono / audiencia. Todo marcado como sugerido y editable.
// No usa logo. No promete licencias.
// ─────────────────────────────────────────────────────────────
import type { Business, BrandColor, BrandKit } from "./types";

interface Preset {
  colors: { primary: string; secondary: string; accent: string; background: string; text: string };
  heading: string;
  body: string;
  mood: string[];
  tone: string[];
  imageStyle: string;
}

const PRESETS: Record<string, Preset> = {
  food: {
    colors: { primary: "#b45309", secondary: "#f59e0b", accent: "#65a30d", background: "#fffaf3", text: "#1c1917" },
    heading: "Poppins",
    body: "Inter",
    mood: ["cálido", "cercano", "artesanal"],
    tone: ["cercana", "simple"],
    imageStyle: "Fotos cálidas de producto y ambiente, luz natural.",
  },
  ecommerce: {
    colors: { primary: "#7c3aed", secondary: "#ec4899", accent: "#22d3ee", background: "#ffffff", text: "#18181b" },
    heading: "Montserrat",
    body: "Inter",
    mood: ["moderno", "vibrante", "aspiracional"],
    tone: ["directa", "joven"],
    imageStyle: "Producto limpio sobre fondos prolijos, estética e-commerce.",
  },
  services: {
    colors: { primary: "#2563eb", secondary: "#0ea5e9", accent: "#10b981", background: "#f8fafc", text: "#0f172a" },
    heading: "Inter",
    body: "Inter",
    mood: ["profesional", "moderno", "confiable"],
    tone: ["profesional", "directa"],
    imageStyle: "Imágenes profesionales, personas reales, tono confiable.",
  },
  beauty: {
    colors: { primary: "#db2777", secondary: "#f9a8d4", accent: "#a78bfa", background: "#fff7fb", text: "#1f1330" },
    heading: "Playfair Display",
    body: "Inter",
    mood: ["elegante", "premium", "cuidado"],
    tone: ["aspiracional", "elegante"],
    imageStyle: "Estética cuidada, primeros planos, luz suave.",
  },
  tech: {
    colors: { primary: "#4f46e5", secondary: "#06b6d4", accent: "#22c55e", background: "#0b1120", text: "#e2e8f0" },
    heading: "Inter",
    body: "Inter",
    mood: ["tecnológico", "moderno", "minimalista"],
    tone: ["directa", "profesional"],
    imageStyle: "Estética tech, gradientes, UI limpia, dark mode.",
  },
  education: {
    colors: { primary: "#2563eb", secondary: "#f59e0b", accent: "#ef4444", background: "#f8fafc", text: "#0f172a" },
    heading: "Poppins",
    body: "Inter",
    mood: ["cercano", "confiable", "joven"],
    tone: ["cercana", "simple"],
    imageStyle: "Imágenes claras y didácticas, personas aprendiendo.",
  },
  fitness: {
    colors: { primary: "#16a34a", secondary: "#84cc16", accent: "#f97316", background: "#0a0a0a", text: "#fafafa" },
    heading: "Montserrat",
    body: "Inter",
    mood: ["enérgico", "moderno", "aspiracional"],
    tone: ["directa", "motivadora"],
    imageStyle: "Fotos con energía, movimiento, contraste alto.",
  },
  creative: {
    colors: { primary: "#db2777", secondary: "#8b5cf6", accent: "#facc15", background: "#fdf4ff", text: "#1e1b2e" },
    heading: "Playfair Display",
    body: "Inter",
    mood: ["artístico", "vibrante", "aspiracional"],
    tone: ["emocional", "canchera"],
    imageStyle: "Estética editorial, composición cuidada, color audaz.",
  },
  nature: {
    colors: { primary: "#15803d", secondary: "#a3e635", accent: "#ca8a04", background: "#f7fee7", text: "#1a2e05" },
    heading: "Lora",
    body: "Inter",
    mood: ["natural", "cálido", "artesanal"],
    tone: ["cercana", "honesta"],
    imageStyle: "Luz natural, texturas orgánicas, tonos tierra.",
  },
  default: {
    colors: { primary: "#db2777", secondary: "#84cc16", accent: "#f472b6", background: "#fafafa", text: "#18181b" },
    heading: "Poppins",
    body: "Inter",
    mood: ["moderno", "cercano", "minimalista"],
    tone: ["cercana", "simple"],
    imageStyle: "Estética simple, cálida y directa.",
  },
};

function presetFor(industry: string): Preset {
  const i = (industry || "").toLowerCase();
  if (i.includes("food") || i.includes("beverage")) return PRESETS.food;
  if (i.includes("tech") || i.includes("software") || i.includes("startup") || i.includes("saas")) return PRESETS.tech;
  if (i.includes("education") || i.includes("training") || i.includes("coaching")) return PRESETS.education;
  if (i.includes("sport") || i.includes("fitness") || i.includes("gym")) return PRESETS.fitness;
  if (i.includes("creative") || i.includes("art") || i.includes("craft") || i.includes("event") || i.includes("entertain"))
    return PRESETS.creative;
  if (i.includes("agriculture") || i.includes("natural") || i.includes("pet") || i.includes("nonprofit") || i.includes("social"))
    return PRESETS.nature;
  if (i.includes("e-commerce") || i.includes("online") || i.includes("retail") || i.includes("fashion")) return PRESETS.ecommerce;
  if (i.includes("beauty") || i.includes("wellness") || i.includes("health")) return PRESETS.beauty;
  if (
    i.includes("service") ||
    i.includes("consult") ||
    i.includes("professional") ||
    i.includes("real estate") ||
    i.includes("financial") ||
    i.includes("construction") ||
    i.includes("home") ||
    i.includes("automotive") ||
    i.includes("manufactur") ||
    i.includes("marketing")
  )
    return PRESETS.services;
  if (i.includes("travel") || i.includes("tourism") || i.includes("hospitality")) return PRESETS.creative;
  return PRESETS.default;
}

// Devuelve un BrandKit parcial sugerido. Si keepLogos, conserva los logos actuales.
export function suggestBrandKit(business: Business, current?: BrandKit): BrandKit {
  const p = presetFor(business.industry);
  const palette: BrandColor[] = [
    { name: "Color principal", hex: p.colors.primary, role: "primary", source: "inferred", confidence: "medium" },
    { name: "Color secundario", hex: p.colors.secondary, role: "secondary", source: "inferred", confidence: "low" },
    { name: "Color de acento", hex: p.colors.accent, role: "accent", source: "inferred", confidence: "low" },
    { name: "Fondo", hex: p.colors.background, role: "background", source: "inferred", confidence: "low" },
    { name: "Texto", hex: p.colors.text, role: "text", source: "inferred", confidence: "low" },
  ];
  return {
    colors: {
      primary: p.colors.primary,
      secondary: p.colors.secondary,
      accent: p.colors.accent,
      background: p.colors.background,
      text: p.colors.text,
      palette,
    },
    typography: {
      heading: { family: p.heading, source: "inferred", confidence: "medium" },
      body: { family: p.body, source: "inferred", confidence: "medium" },
    },
    // Conservamos logos existentes (no se borran sin confirmación).
    logos: current?.logos || [],
    visualStyle: {
      mood: p.mood,
      imageStyle: p.imageStyle,
      designNotes: `Identidad sugerida por Eva para ${business.industry || "tu rubro"}: ${p.mood.join(", ")}.`,
    },
    voiceTone: { toneTags: p.tone },
    brandKeywords: current?.brandKeywords || [],
    avoidList: current?.avoidList || [],
  };
}
