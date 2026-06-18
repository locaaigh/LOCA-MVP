"use client";

import * as React from "react";
import { Badge, Button, Card, ChipSelect, Field, Input, Select, Textarea } from "@/components/ui";
import { EvaSuggestionButton } from "@/components/inputs";
import { CURRENCIES } from "@/lib/constants";
import { getFieldExample } from "@/lib/examples";
import { parseProductsCsv } from "@/lib/csv-import";
import { api } from "@/lib/api";
import type { Business, ProductService } from "@/lib/types";
import { Pencil, Trash2, Check, Star, Upload, FileSpreadsheet } from "lucide-react";

// ── Card minimizada de un producto/servicio guardado ─────────
export function ProductServiceCard({
  ps,
  onEdit,
  onRemove,
}: {
  ps: ProductService;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const price =
    ps.priceMin != null
      ? `${ps.currency} ${ps.priceMin}${ps.priceMax != null ? `–${ps.priceMax}` : ""}`
      : "Sin precio";
  const origin = originBadge(ps);
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200/70 bg-white p-3.5 transition-shadow hover:shadow-sm">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-loca-50 text-loca-600 ring-1 ring-loca-100">
          <Check className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate font-semibold text-zinc-800">
            {ps.name || "Sin nombre"}
            {ps.isTopSeller && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                <Star className="h-2.5 w-2.5" /> Top seller
              </span>
            )}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-zinc-400">{ps.type === "producto" ? "Producto" : "Servicio"}</span>
            {price === "Sin precio" ? (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">Sin precio</span>
            ) : (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600">{price}</span>
            )}
            {origin && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${origin.cls}`}>{origin.label}</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button onClick={onEdit} className="rounded-xl p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700">
          <Pencil className="h-4 w-4" />
        </button>
        <button onClick={onRemove} className="rounded-xl p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-500">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Formulario editable de un producto/servicio ──────────────
export function ProductServiceForm({
  business,
  ps,
  onChange,
  onSave,
  onRemove,
  onToast,
}: {
  business: Business;
  ps: ProductService;
  onChange: (patch: Partial<ProductService>) => void;
  onSave: () => void;
  onRemove: () => void;
  onToast?: (m: string) => void;
}) {
  const [aiLoading, setAiLoading] = React.useState(false);
  const isProduct = ps.type === "producto";

  async function generateWithEva() {
    setAiLoading(true);
    try {
      const res = await api.productDescription(business, ps);
      onChange({
        shortDescription: res.data.shortDescription,
        longDescription: res.data.longDescription,
        features: res.data.features,
        keywords: res.data.keywords,
      });
      onToast?.(res.meta?.warning || "Eva completó la descripción ✨");
    } catch {
      onToast?.("No se pudo generar. Probá de nuevo.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <Card className="space-y-4 rounded-3xl border-loca-200">
      <div className="flex items-center justify-between">
        <Badge tone="pink">{isProduct ? "Producto" : "Servicio"}</Badge>
        <button onClick={onRemove} className="rounded-xl p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-500">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <Field label="Nombre">
        <Input
          value={ps.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder={getFieldExample("productName", business.industry)}
        />
      </Field>

      <div className="flex flex-col gap-2 rounded-2xl border border-loca-100 bg-loca-50/50 p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-zinc-500">
          ¿No sabés qué poner en las descripciones? Que Eva las escriba por vos.
        </p>
        <EvaSuggestionButton label="Generar con Eva" onClick={generateWithEva} loading={aiLoading} />
      </div>

      <Field label="Descripción corta">
        <Input
          value={ps.shortDescription}
          onChange={(e) => onChange({ shortDescription: e.target.value })}
          placeholder={getFieldExample("productShort", business.industry)}
        />
      </Field>
      <Field label="Descripción larga">
        <Textarea
          value={ps.longDescription}
          onChange={(e) => onChange({ longDescription: e.target.value })}
          placeholder={getFieldExample("productLong", business.industry)}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={isProduct ? "Materiales / features" : "Features"}>
          <ChipSelect
            options={[]}
            value={ps.features}
            onChange={(v) => onChange({ features: v })}
            allowCustom
          />
        </Field>
        <Field label="Categoría">
          <Input value={ps.category} onChange={(e) => onChange({ category: e.target.value })} />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Tipo de precio">
          <Select
            value={ps.pricingType}
            onChange={(e) => onChange({ pricingType: e.target.value as any })}
          >
            <option value="fijo">Fijo</option>
            <option value="rango">Rango</option>
            <option value={isProduct ? "por_variante" : "variable"}>
              {isProduct ? "Por variante" : "Variable"}
            </option>
          </Select>
        </Field>
        <Field label="Moneda">
          <Select value={ps.currency} onChange={(e) => onChange({ currency: e.target.value })}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Precio (min)">
          <Input
            type="number"
            value={ps.priceMin ?? ""}
            onChange={(e) => onChange({ priceMin: e.target.value ? Number(e.target.value) : undefined })}
          />
        </Field>
        <Field label="Precio (max)">
          <Input
            type="number"
            value={ps.priceMax ?? ""}
            onChange={(e) => onChange({ priceMax: e.target.value ? Number(e.target.value) : undefined })}
          />
        </Field>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 rounded-2xl border border-zinc-200/70 bg-white p-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">
        <input
          type="checkbox"
          checked={ps.isTopSeller}
          onChange={(e) => onChange({ isTopSeller: e.target.checked })}
          className="h-4 w-4 rounded border-zinc-300 text-loca-600"
        />
        <span className="inline-flex items-center gap-1.5">
          <Star className="h-3.5 w-3.5 text-amber-500" /> Marcar como top seller
        </span>
      </label>

      <div className="flex gap-2 pt-1">
        <Button size="lg" className="flex-1" onClick={onSave} disabled={!ps.name.trim()}>
          <Check className="h-4 w-4" /> Guardar {isProduct ? "producto" : "servicio"}
        </Button>
      </div>
    </Card>
  );
}

// ── Importador CSV / XLSX ────────────────────────────────────
export function ProductServiceImporter({
  onImport,
}: {
  onImport: (items: ProductService[]) => void;
}) {
  const [preview, setPreview] = React.useState<ProductService[] | null>(null);
  const [errors, setErrors] = React.useState<string[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setErrors([]);
    const name = file.name.toLowerCase();
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      setErrors([
        "Por ahora soportamos CSV. Exportá tu Excel como .csv (Archivo → Guardar como → CSV) y subilo.",
      ]);
      return;
    }
    const text = await file.text();
    const res = parseProductsCsv(text);
    setErrors(res.errors);
    setPreview(res.items);
  }

  function confirm() {
    if (preview && preview.length) onImport(preview);
    setPreview(null);
    setErrors([]);
  }

  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/50 p-5">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-sm font-medium text-zinc-700">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-zinc-400 ring-1 ring-zinc-200/70">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <span>Subí tu base de productos/servicios (CSV)</span>
        </div>
        <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
          <Upload className="h-4 w-4" /> Subir archivo
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
      <p className="mt-3 text-xs text-zinc-400">
        Columnas aceptadas: name, type, category, shortDescription, longDescription, price, currency, keywords.
      </p>

      {errors.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-xl bg-red-50 p-3 text-xs text-red-600 ring-1 ring-inset ring-red-100">
          {errors.map((e, i) => (
            <li key={i}>• {e}</li>
          ))}
        </ul>
      )}

      {preview && preview.length > 0 && (
        <div className="mt-4 space-y-2.5">
          <p className="text-sm font-semibold text-zinc-700">
            Eva detectó {preview.length} {preview.length === 1 ? "ítem" : "ítems"}. Revisalos antes de seguir.
          </p>
          <div className="max-h-48 overflow-y-auto rounded-xl border border-zinc-200/70">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-2 py-1.5">Nombre</th>
                  <th className="px-2 py-1.5">Tipo</th>
                  <th className="px-2 py-1.5">Precio</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((p) => (
                  <tr key={p.id} className="border-t border-zinc-100">
                    <td className="px-2 py-1.5">{p.name}</td>
                    <td className="px-2 py-1.5">{p.type}</td>
                    <td className="px-2 py-1.5">{p.priceMin ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={confirm}>
              <Check className="h-4 w-4" /> Importar {preview.length}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPreview(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Badge de origen/estado del ítem detectado/sugerido.
function originBadge(ps: ProductService): { label: string; cls: string } | null {
  if (ps.shouldReview) return { label: "Revisar", cls: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100" };
  switch (ps.importSource) {
    case "website":
      return { label: "Encontrado en web", cls: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100" };
    case "md":
      return { label: "Confirmado por tu IA", cls: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100" };
    case "eva":
      return { label: "Sugerido por Eva", cls: "bg-loca-50 text-loca-700 ring-1 ring-inset ring-loca-100" };
    default:
      return null;
  }
}
