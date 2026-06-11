"use client";

import { cn } from "@/lib/utils";
import { Loader2, X } from "lucide-react";
import * as React from "react";

// ── Button ───────────────────────────────────────────────────
type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "lima";
type Size = "sm" | "md" | "lg" | "xl";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-loca-600 text-white hover:bg-loca-700 shadow-sm hover:shadow-lift active:scale-[0.98]",
  lima: "bg-lima-400 text-ink hover:bg-lima-500 shadow-sm active:scale-[0.98]",
  secondary: "bg-zinc-900 text-white hover:bg-zinc-800 active:scale-[0.98]",
  outline: "border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 hover:border-zinc-300",
  ghost: "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
  danger: "bg-red-600 text-white hover:bg-red-700 active:scale-[0.98]",
};
const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-xs",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-[15px]",
  xl: "h-14 px-7 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

// ── Card ─────────────────────────────────────────────────────
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("loca-card p-5", className)} {...props} />;
}

// ── Badge ────────────────────────────────────────────────────
const BADGE_TONES: Record<string, string> = {
  default: "bg-zinc-100 text-zinc-600",
  pink: "bg-loca-50 text-loca-700 ring-1 ring-inset ring-loca-100",
  lima: "bg-lima-50 text-lima-700 ring-1 ring-inset ring-lima-200",
  green: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100",
  yellow: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100",
  red: "bg-red-50 text-red-600 ring-1 ring-inset ring-red-100",
  blue: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100",
};
export function Badge({
  tone = "default",
  className,
  children,
}: {
  tone?: keyof typeof BADGE_TONES;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        BADGE_TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

// ── Inputs ───────────────────────────────────────────────────
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("loca-input", props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn("loca-input min-h-[90px]", props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn("loca-input", props.className)} />;
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="loca-label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
    </div>
  );
}

// ── Multi-select por tags (chips) ────────────────────────────
export function ChipSelect({
  options,
  value,
  onChange,
  allowCustom,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  allowCustom?: boolean;
}) {
  const [custom, setCustom] = React.useState("");
  const toggle = (opt: string) => {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  };
  const addCustom = () => {
    const c = custom.trim();
    if (c && !value.includes(c)) onChange([...value, c]);
    setCustom("");
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition",
              value.includes(opt)
                ? "border-loca-500 bg-loca-50 text-loca-700"
                : "border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400"
            )}
          >
            {opt}
          </button>
        ))}
        {value
          .filter((v) => !options.includes(v))
          .map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => toggle(v)}
              className="rounded-full border border-loca-500 bg-loca-50 px-3 py-1 text-xs text-loca-700"
            >
              {v} ✕
            </button>
          ))}
      </div>
      {allowCustom && (
        <div className="mt-2 flex gap-2">
          <Input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="Agregar otro…"
            className="h-8 text-xs"
          />
          <Button type="button" size="sm" variant="outline" onClick={addCustom}>
            Agregar
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Modal / Drawer ───────────────────────────────────────────
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

// ── Spinner de Eva ───────────────────────────────────────────
export function EvaLoading({ text = "Eva está preparando todo…" }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <div className="relative">
        <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-loca-300/50" />
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-loca-500 to-loca-700 shadow-lift" />
        <Loader2 className="absolute inset-0 m-auto h-7 w-7 animate-spin text-white" />
      </div>
      <p className="text-sm font-medium text-zinc-600">{text}</p>
      <p className="text-xs text-zinc-400">Esto tarda solo unos segundos.</p>
    </div>
  );
}

// ── Header de página (título + subtítulo + acciones) ─────────
export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

// ── Label de sección (uppercase sutil) ───────────────────────
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{children}</p>
  );
}

// ── Estado vacío reutilizable ────────────────────────────────
export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-loca-50 text-loca-600">
        <Icon className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-zinc-900">{title}</h2>
      {description && <p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p>}
      {children && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{children}</div>}
    </Card>
  );
}

// ── Toast simple ─────────────────────────────────────────────
export function useToast() {
  const [msg, setMsg] = React.useState<string | null>(null);
  const show = React.useCallback((m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 2200);
  }, []);
  const node = msg ? (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg">
      {msg}
    </div>
  ) : null;
  return { show, node };
}
