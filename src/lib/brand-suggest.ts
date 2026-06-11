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
  if (i.includes("e-commerce") || i.includes("online") || i.includes("retail") || i.includes("fashion")) return PRESETS.ecommerce;
  if (i.includes("beauty") || i.includes("wellness") || i.includes("health")) return PRESETS.beauty;
  if (i.includes("service") || i.includes("consult") || i.includes("professional") || i.includes("real estate") || i.includes("financial"))
    return PRESETS.services;
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
