"use client";

import { BrandKitEditor } from "@/components/brand-kit";
import { PhotoUploader } from "@/components/photo-uploader";
import { Card } from "@/components/ui";
import { VisualStylePicker } from "@/components/visual-style-picker";
import { emptyBrandKit } from "@/lib/store";
import type { Business } from "@/lib/types";

// ── Paso 3: Identidad visual (Brand Kit) ─────────────────────
export function StepBrandKit({ b, set }: { b: Business; set: (p: Partial<Business>) => void }) {
  const bk = b.brandKit || emptyBrandKit();
  const isProfessional = b.businessStage === "profesional_independiente" || b.businessType === "Marca personal";
  return (
    <div className="space-y-5">
      <BrandKitEditor business={b} brandKit={bk} onChange={(patch) => set({ brandKit: { ...bk, ...patch } })} />

      {/* Estilo visual de los contenidos (item 16) */}
      <Card className="space-y-4 rounded-3xl">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-foreground">Estilo visual de tus contenidos</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Elegí uno o varios estilos. Definen cómo Eva piensa y arma las imágenes.
          </p>
        </div>
        <VisualStylePicker value={b.visualStyles || []} onChange={(visualStyles) => set({ visualStyles })} />
      </Card>

      {/* Fotos de la persona — solo profesional independiente / marca personal (item 20) */}
      {isProfessional && (
        <Card id="personPhotos" className="scroll-mt-24 space-y-3 rounded-3xl border-2 border-loca-200">
          <div className="flex items-start gap-3">
            <span className="text-2xl leading-none">🧑‍💼</span>
            <div>
              <h3 className="text-lg font-bold tracking-tight text-foreground">Subí fotos tuyas (importante)</h3>
              <p className="mt-0.5 text-sm text-muted-foreground-2">
                Como sos vos la cara de la marca, Eva usa tus fotos reales para el contenido.
                <strong className="text-foreground-soft"> Nunca vamos a inventar una cara como si fueras vos.</strong>{" "}
                Subí varias, con distinta pose/fondo, bien nombradas.
              </p>
            </div>
          </div>
          <PhotoUploader
            photos={b.personPhotos || []}
            onChange={(personPhotos) => set({ personPhotos })}
            kind="person"
            ctaLabel="Subir mis fotos"
          />
        </Card>
      )}
    </div>
  );
}
