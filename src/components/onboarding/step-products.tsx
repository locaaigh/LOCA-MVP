"use client";

import { ProductServiceCard, ProductServiceForm, ProductServiceImporter } from "@/components/product-service";
import { Button } from "@/components/ui";
import { getFieldExample } from "@/lib/examples";
import { emptyProductService } from "@/lib/onboarding/apply-analysis";
import type { Business, ProductService, ProductServiceType } from "@/lib/types";
import { Plus, Sparkles } from "lucide-react";
import { useState } from "react";

// ── Paso 3: Productos / Servicios ────────────────────────────

export function StepProducts({
  b,
  set,
  show,
}: {
  b: Business;
  set: (p: Partial<Business>) => void;
  show: (m: string) => void;
}) {
  const items = b.productsServices;
  const [editingId, setEditingId] = useState<string | null>(null);

  const update = (id: string, patch: Partial<ProductService>) =>
    set({ productsServices: items.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  const remove = (id: string) => {
    set({ productsServices: items.filter((x) => x.id !== id) });
    if (editingId === id) setEditingId(null);
  };
  const add = (type: ProductServiceType) => {
    const ps = emptyProductService(type);
    set({ productsServices: [...items, ps] });
    setEditingId(ps.id);
  };
  const save = (id: string) => {
    // Guardar = confirmar: limpia shouldReview (el usuario lo revisó).
    update(id, { saved: true, shouldReview: false });
    setEditingId(null);
    show("Guardado ✓");
  };
  // Confirmación rápida de un sugerido por Eva, sin abrir el editor completo.
  const confirmReview = (id: string) => {
    update(id, { shouldReview: false });
    show("Confirmado ✓");
  };
  const addMany = (list: ProductService[]) => set({ productsServices: [...items, ...list] });

  // Sugerencias seguras por industria (marcadas como sugeridas, sin precio).
  const suggestByEva = () => {
    const base = getFieldExample("productName", b.industry) || "Producto principal";
    addMany([
      { ...emptyProductService("producto"), name: base, saved: true, importSource: "eva", confidence: "low", shouldReview: true },
      { ...emptyProductService("servicio"), name: "Servicio principal", saved: true, importSource: "eva", confidence: "low", shouldReview: true },
    ]);
    show("Eva sugirió algunos. Revisalos y editá nombres/precios.");
  };
  const useExamples = () => {
    addMany([
      {
        ...emptyProductService("producto"),
        name: getFieldExample("productName", b.industry) || "Producto",
        shortDescription: getFieldExample("productShort", b.industry),
        saved: true,
        importSource: "eva",
        shouldReview: true,
      },
    ]);
    show("Cargamos un ejemplo de tu industria. Editalo con tus datos.");
  };

  const detected = items.some((x) => x.importSource && x.importSource !== "manual");
  // El cartel de fotos de producto solo aplica si el negocio vende productos.
  // Lo ocultamos si ya cargó ítems y son todos servicios (feedback form, ítem 12).
  const sellsOnlyServices = items.length > 0 && items.every((x) => x.type === "servicio");

  return (
    <div id="products" className="scroll-mt-24 space-y-4">
      {/* Cartel de fotos de producto (feedback form, ítem 12: contraste + condicional) */}
      {!sellsOnlyServices && (
        <div className="flex items-start gap-3 rounded-2xl border-2 border-amber-400 dark:border-amber-600 bg-amber-100 dark:bg-amber-950/60 p-4">
          <span className="text-2xl leading-none">📸</span>
          <p className="text-sm font-semibold leading-snug text-amber-950 dark:text-amber-50">
            Si vendés productos, es fundamental que subas fotos bien nombradas para crear contenido de mayor valor.
          </p>
        </div>
      )}

      <p className="rounded-lg bg-surface-subtle p-3 text-sm text-muted-foreground">
        {detected
          ? "Eva detectó estos productos/servicios. Revisalos rápido: podés editar, eliminar o sumar otros. No agregamos precios si no aparecen en tu web."
          : "No hace falta cargar todo tu catálogo. Empezá por tus productos o servicios más importantes."}
      </p>

      {/* Estado vacío: acciones rápidas */}
      {items.length === 0 && (
        <div className="rounded-xl border border-dashed border-border-strong p-4 text-center">
          <p className="text-sm text-muted-foreground">No pudimos detectar productos o servicios con seguridad.</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Button size="sm" variant="outline" onClick={suggestByEva}>
              <Sparkles className="h-4 w-4" /> Que Eva sugiera según mi negocio
            </Button>
            <Button size="sm" variant="outline" onClick={() => add("producto")}>
              <Plus className="h-4 w-4" /> Agregar manualmente
            </Button>
            <Button size="sm" variant="ghost" onClick={useExamples}>
              Usar ejemplos de mi industria
            </Button>
          </div>
        </div>
      )}

      <ProductServiceImporter
        onImport={(imported) => {
          set({ productsServices: [...items, ...imported] });
          show(`Eva detectó ${imported.length} ítems. Podés editarlos antes de seguir.`);
        }}
      />

      {items.map((ps) =>
        ps.saved && editingId !== ps.id ? (
          <ProductServiceCard
            key={ps.id}
            ps={ps}
            onEdit={() => setEditingId(ps.id)}
            onRemove={() => remove(ps.id)}
            onConfirm={ps.shouldReview ? () => confirmReview(ps.id) : undefined}
          />
        ) : (
          <ProductServiceForm
            key={ps.id}
            business={b}
            ps={ps}
            onChange={(patch) => update(ps.id, patch)}
            onSave={() => save(ps.id)}
            onRemove={() => remove(ps.id)}
            onToast={show}
          />
        )
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => add("producto")}>
          <Plus className="h-4 w-4" /> Agregar {items.length ? "otro " : ""}producto
        </Button>
        <Button size="sm" variant="outline" onClick={() => add("servicio")}>
          <Plus className="h-4 w-4" /> Agregar {items.length ? "otro " : ""}servicio
        </Button>
      </div>
    </div>
  );
}
