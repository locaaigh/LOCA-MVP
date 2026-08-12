import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth-provider";
import { AiUsageOverlay } from "@/components/ai-usage-overlay";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { AppLinkUtms } from "@/components/app-link-utms";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/components/theme-provider";
import "./globals.css";

// Base para resolver URLs absolutas (canonical, OG). Con dominios separados
// las páginas indexables son las de marketing, así que el canonical siempre
// apunta ahí. Mismo default que src/app/robots.ts y src/app/sitemap.ts.
const MARKETING_ORIGIN =
  process.env.NEXT_PUBLIC_MARKETING_ORIGIN?.replace(/\/$/, "") || "https://heyloca.ai";

export const metadata: Metadata = {
  metadataBase: new URL(MARKETING_ORIGIN),
  title: "LOCA — Humanless marketing",
  description:
    "Tu marketing listo en minutos. Completá un formulario y Eva genera estrategia, calendario, contenidos, imágenes y anuncios.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Anti-FOUC: aplica el tema en <html> antes del primer paint */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
          <AiUsageOverlay />
          <AnalyticsProvider />
          <AppLinkUtms />
        </ThemeProvider>
      </body>
    </html>
  );
}
