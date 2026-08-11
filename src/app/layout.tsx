import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth-provider";
import { AiUsageOverlay } from "@/components/ai-usage-overlay";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
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
        </ThemeProvider>
      </body>
    </html>
  );
}
