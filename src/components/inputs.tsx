"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { COUNTRIES, regionsFor } from "@/lib/geo";
import { Check, ChevronDown, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui";

// ── Field con ayuda contextual + marca de requerido/error ────
export function HelpField({
  label,
  help,
  hint,
  error,
  required,
  id,
  children,
}: {
  label: string;
  help?: string; // microcopy debajo del campo
  hint?: string; // texto chico a la derecha (ej contador)
  error?: boolean;
  required?: boolean;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-24">
      <div className="mb-1 flex items-center justify-between">
        <label className={cn("text-sm font-medium", error ? "text-red-600" : "text-zinc-700")}>
          {label} {required && <span className="text-loca-500">*</span>}
        </label>
        {hint && <span className="text-xs text-zinc-400">{hint}</span>}
      </div>
      {children}
      {help && <p className="mt-1 text-xs text-zinc-400">{help}</p>}
    </div>
  );
}

// ── Searchable select (combobox) ─────────────────────────────
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Buscar…",
  allowFreeText = false,
  error,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  allowFreeText?: boolean;
  error?: boolean;
  id?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const select = (v: string) => {
    onChange(v);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={ref} id={id} className="relative scroll-mt-24">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-left text-sm transition",
          error ? "border-red-400" : "border-zinc-300 hover:border-zinc-400"
        )}
      >
        <span className={value ? "text-zinc-900" : "text-zinc-400"}>
          {value || placeholder}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2">
            <Search className="h-4 w-4 text-zinc-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Escribí para buscar…"
              className="w-full text-sm outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (filtered[0]) select(filtered[0]);
                  else if (allowFreeText && query.trim()) select(query.trim());
                }
              }}
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => select(o)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-loca-50"
              >
                {o}
                {value === o && <Check className="h-4 w-4 text-loca-600" />}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-zinc-400">
                {allowFreeText ? (
                  <button
                    type="button"
                    onClick={() => select(query.trim())}
                    className="text-loca-600 hover:underline"
                  >
                    Usar “{query.trim()}”
                  </button>
                ) : (
                  "Sin resultados"
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function SearchableCountrySelect(props: {
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
  id?: string;
}) {
  return (
    <SearchableSelect
      {...props}
      options={COUNTRIES}
      placeholder="Elegí tu país"
      allowFreeText
    />
  );
}

export function SearchableRegionSelect({
  country,
  ...props
}: {
  country: string;
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
  id?: string;
}) {
  const regions = regionsFor(country);
  return (
    <SearchableSelect
      {...props}
      options={regions}
      placeholder={regions.length ? "Elegí provincia / estado" : "Escribí tu provincia / estado"}
      allowFreeText
    />
  );
}

// ── Option cards (selección visual, single o multi) ──────────
export interface OptionItem {
  value: string;
  label: string;
  desc?: string;
  icon?: React.ReactNode;
}

export function OptionCards({
  options,
  value,
  onChange,
  multi = false,
  columns = 2,
}: {
  options: OptionItem[];
  value: string | string[];
  onChange: (v: any) => void;
  multi?: boolean;
  columns?: 2 | 3 | 4;
}) {
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  const toggle = (v: string) => {
    if (multi) {
      onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
    } else {
      onChange(v);
    }
  };
  const colClass =
    columns === 4
      ? "grid-cols-2 sm:grid-cols-4"
      : columns === 3
        ? "grid-cols-1 sm:grid-cols-3"
        : "grid-cols-1 sm:grid-cols-2";

  return (
    <div className={cn("grid gap-2", colClass)}>
      {options.map((o) => {
        const active = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            className={cn(
              "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition",
              active
                ? "border-loca-500 bg-loca-50 text-loca-700"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
            )}
          >
            {o.icon && <span className="mt-0.5 shrink-0">{o.icon}</span>}
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 font-medium">
                {o.label}
                {active && <Check className="h-3.5 w-3.5 shrink-0" />}
              </span>
              {o.desc && <span className="mt-0.5 block text-xs text-zinc-400">{o.desc}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Sí / No ──────────────────────────────────────────────────
export function YesNoChoice({
  value,
  onChange,
  yesLabel = "Sí",
  noLabel = "No",
}: {
  value: boolean | undefined;
  onChange: (v: boolean) => void;
  yesLabel?: string;
  noLabel?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[
        { v: false, l: noLabel },
        { v: true, l: yesLabel },
      ].map(({ v, l }) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            "rounded-xl border px-3 py-2.5 text-sm font-medium transition",
            value === v
              ? "border-loca-500 bg-loca-50 text-loca-700"
              : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

// ── Botón "Que Eva lo sugiera" / "Generar con IA" ────────────
export function EvaSuggestionButton({
  onClick,
  loading,
  label = "Que Eva lo sugiera",
}: {
  onClick: () => void;
  loading?: boolean;
  label?: string;
}) {
  return (
    <Button type="button" size="sm" variant="outline" onClick={onClick} loading={loading}>
      {!loading && <Sparkles className="h-3.5 w-3.5 text-loca-500" />}
      {label}
    </Button>
  );
}
