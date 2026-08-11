import type { MetadataRoute } from "next";

const BASE =
  process.env.NEXT_PUBLIC_MARKETING_ORIGIN?.replace(/\/$/, "") || "https://heyloca.ai";

// Indexable: solo la web de marketing. La app y las rutas API no deben
// aparecer en Google (contenido privado/por usuario).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard",
          "/onboarding",
          "/strategy",
          "/content",
          "/calendar",
          "/ads",
          "/metrics",
          "/settings",
          "/login",
          "/signup",
          "/demo",
          "/auth/",
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
