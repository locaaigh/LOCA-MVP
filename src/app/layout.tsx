import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth-provider";
import { AiUsageOverlay } from "@/components/ai-usage-overlay";
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
    <html lang="es">
      <body>
        <AuthProvider>{children}</AuthProvider>
        <AiUsageOverlay />
      </body>
    </html>
  );
}
