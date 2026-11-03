"use client";

import type { Business, ContentItem } from "@/lib/types";
import { brandedPlaceholder } from "@/lib/placeholder";
import { cn } from "@/lib/utils";
import { EvaWorking } from "./eva-working";

const ASPECT: Record<string, string> = {
  "1:1": "aspect-square",
  "4:5": "aspect-[4/5]",
  "9:16": "aspect-[9/16]",
};

// Preview de la pieza: muestra la imagen REAL limpia, sin texto/CTA encima
// (para no hacer creer que la imagen incluye esos textos). El logo de la red
// lo agrega la card; el copy va debajo. Ver PLAN-v2 (imagen limpia en aprobados).
export function ContentPreview({
  content,
  business,
  className,
}: {
  content: ContentItem;
  business: Business;
  className?: string;
}) {
  const placeholderConcept =
    content.imageStatus === "generando"
      ? "Generando imagen con IA…"
      : content.imageStatus === "error"
        ? content.imageError || "Error al generar imagen"
        : content.imageStatus === "pendiente"
          ? "Sin imagen — generá una desde la pieza"
          : "Imagen no disponible";

  // Imagen real generada: se muestra en su PROPORCIÓN ORIGINAL, sin recortar
  // (es lo que se va a publicar). El placeholder sí usa el formato pedido.
  const hasRealImage = !!content.imageUrl;
  const img =
    content.imageUrl ||
    brandedPlaceholder({
      format: content.imageFormat,
      label: business.name,
      concept: placeholderConcept,
    });
  const brandColor = business.brandColors?.[0] || "#ec4899";

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl bg-surface-muted shadow-soft",
        !hasRealImage && ASPECT[content.imageFormat],
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img}
        alt={content.title}
        className={hasRealImage ? "block h-auto w-full" : "absolute inset-0 h-full w-full object-cover"}
      />
      {/* Imagen limpia: sin marca / texto / CTA superpuestos. La red social se
          indica con el logo que agrega la card, y el copy va debajo. */}
      {/* Mientras Eva genera la imagen: overlay animado en vez del placeholder "LOCA" (item 12) */}
      {content.imageStatus === "generando" && !content.imageUrl && <EvaWorking brandColor={brandColor} />}
    </div>
  );
}
