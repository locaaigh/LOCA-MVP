"use client";

import type { Business, ContentItem } from "@/lib/types";
import { brandedPlaceholder } from "@/lib/placeholder";
import { cn } from "@/lib/utils";

const ASPECT: Record<string, string> = {
  "1:1": "aspect-square",
  "4:5": "aspect-[4/5]",
  "9:16": "aspect-[9/16]",
};

// Preview visual editable de la pieza: imagen + marca + overlay + CTA.
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

  const img =
    content.imageUrl ||
    brandedPlaceholder({
      format: content.imageFormat,
      label: business.name,
      concept: placeholderConcept,
    });
  const brandColor = business.brandColors?.[0] || "#ec4899";

  return (
    <div className={cn("relative w-full overflow-hidden rounded-2xl bg-zinc-900 shadow-soft", ASPECT[content.imageFormat], className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img} alt={content.title} className="absolute inset-0 h-full w-full object-cover" />
      {/* Gradiente para legibilidad */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      {/* Marca */}
      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold">
        <span style={{ color: brandColor }}>{business.name}</span>
      </div>
      {/* Overlay de texto */}
      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        {content.designTextOverlay && (
          <p className="overflow-wrap-anywhere line-clamp-3 text-lg font-extrabold leading-tight drop-shadow-md">
            {content.designTextOverlay}
          </p>
        )}
        <span
          className="overflow-wrap-anywhere mt-2 inline-block max-w-full rounded-full px-3 py-1 text-xs font-semibold text-white"
          style={{ backgroundColor: brandColor }}
        >
          {content.cta}
        </span>
      </div>
    </div>
  );
}
