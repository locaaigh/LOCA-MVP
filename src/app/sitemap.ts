import type { MetadataRoute } from "next";
import { INDUSTRIES } from "@/lib/marketing/industries";

// Sitemap de la web de marketing (requisito para Google Search Console).
// Solo páginas públicas indexables; la app (dashboard, onboarding, etc.)
// queda fuera a propósito (ver robots.ts).
const BASE =
  process.env.NEXT_PUBLIC_MARKETING_ORIGIN?.replace(/\/$/, "") || "https://heyloca.ai";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    { path: "/", priority: 1 },
    { path: "/como-funciona", priority: 0.9 },
    { path: "/funcionalidades", priority: 0.9 },
    { path: "/precios", priority: 0.9 },
    ...INDUSTRIES.map((i) => ({ path: `/para/${i.slug}`, priority: 0.8 })),
    { path: "/contacto", priority: 0.6 },
    { path: "/legal/privacy", priority: 0.2 },
    { path: "/legal/terms", priority: 0.2 },
  ];
  return pages.map((p) => ({
    url: `${BASE}${p.path === "/" ? "" : p.path}`,
    changeFrequency: "weekly",
    priority: p.priority,
  }));
}
