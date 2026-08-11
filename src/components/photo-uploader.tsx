"use client";

import * as React from "react";
import { Button } from "@/components/ui";
import { uid, nowIso } from "@/lib/utils";
import type { UploadedPhoto, UploadedPhotoKind } from "@/lib/types";
import { Upload, Trash2 } from "lucide-react";

/**
 * Subida de fotos reales (producto / persona) como referencias de generación.
 * Cada foto lleva una etiqueta editable (la nomenclatura importa para Eva).
 * Ver PLAN-v2 items 17, 18, 20. Hoy guarda dataUrl; en producción irá a Storage.
 */
export function PhotoUploader({
  photos,
  onChange,
  kind,
  ctaLabel = "Subir fotos",
  className,
}: {
  photos: UploadedPhoto[];
  onChange: (photos: UploadedPhoto[]) => void;
  kind: UploadedPhotoKind;
  ctaLabel?: string;
  className?: string;
}) {
  const ref = React.useRef<HTMLInputElement>(null);

  function onFiles(files: FileList | null) {
    if (!files) return;
    const readers = Array.from(files).map(
      (f) =>
        new Promise<UploadedPhoto>((resolve) => {
          const r = new FileReader();
          r.onload = () =>
            resolve({
              id: uid("photo"),
              label: f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim(),
              kind,
              dataUrl: String(r.result),
              createdAt: nowIso(),
            });
          r.readAsDataURL(f);
        })
    );
    Promise.all(readers).then((added) => onChange([...photos, ...added]));
  }

  const update = (id: string, patch: Partial<UploadedPhoto>) =>
    onChange(photos.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const remove = (id: string) => onChange(photos.filter((p) => p.id !== id));

  return (
    <div className={className}>
      {photos.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {photos.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border/70 bg-card p-2">
              <div className="relative aspect-square overflow-hidden rounded-xl bg-surface-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.dataUrl || p.url} alt={p.label} className="h-full w-full object-cover" />
                <button
                  onClick={() => remove(p.id)}
                  className="absolute right-1 top-1 rounded-full bg-card/90 p-1 text-faint transition hover:text-red-500 dark:hover:text-red-400"
                  aria-label="Eliminar foto"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <input
                value={p.label}
                onChange={(e) => update(p.id, { label: e.target.value })}
                placeholder="Nombrá esta foto"
                className="mt-1.5 w-full bg-transparent text-center text-xs font-medium text-foreground-muted outline-none placeholder:text-faint"
                aria-label="Nombre de la foto"
              />
            </div>
          ))}
        </div>
      )}
      <Button size="sm" variant="outline" onClick={() => ref.current?.click()}>
        <Upload className="h-4 w-4" /> {ctaLabel}
      </Button>
      <input
        ref={ref}
        type="file"
        accept=".png,.jpg,.jpeg,.webp"
        multiple
        className="hidden"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
