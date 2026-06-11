"use client";

import * as React from "react";
import { Badge, Button, Card, ChipSelect, Field, Input, Select, Textarea } from "@/components/ui";
import { OptionCards } from "@/components/inputs";
import { uid } from "@/lib/utils";
import type { BrandColor, BrandKit, BrandLogo } from "@/lib/types";
import { Star, Trash2, Plus, Upload, Palette, Type, ImageIcon, Sparkles } from "lucide-react";

const MOOD_OPTIONS = [
  "moderno", "minimalista", "premium", "cálido", "cercano", "divertido",
  "elegante", "artesanal", "tecnológico", "institucional", "aspiracional", "joven",
];
const TONE_OPTIONS = [
  "cercana", "premium", "técnica", "divertida", "institucional", "aspiracional",
  "directa", "emocional", "joven", "elegante", "simple", "canchera", "profesional", "artesanal",
];
const AVOID_OPTIONS = [
  "No prometer resultados garantizados",
  "No usar lenguaje demasiado vendedor",
  "No usar emojis",
  "No decir “barato”",
  "No hablar de descuentos",
  "No usar tono informal",
  "No usar lenguaje técnico",
  "No sonar demasiado corporativo",
  "No usar humor",
  "No mencionar precios",
];
const FONT_SUGGESTIONS = ["Inter", "Poppins", "Montserrat", "Open Sans", "Roboto", "Lora", "Playfair Display"];

const ROLE_LABELS: Record<BrandColor["role"], string> = {
  primary: "Principal",
  secondary: "Secundario",
  accent: "Acento",
  background: "Fondo",
  text: "Texto",
  other: "Otro",
};

export function BrandKitEditor({
  brandKit,
  onChange,
}: {
  brandKit: BrandKit;
  onChange: (patch: Partial<BrandKit>) => void;
}) {
  const bk = brandKit;

  const updateColor = (i: number, patch: Partial<BrandColor>) => {
    const palette = bk.colors.palette.map((c, idx) => (idx === i ? { ...c, ...patch, source: "user" as const } : c));
    onChange({ colors: { ...bk.colors, palette, ...primaryFrom(palette) } });
  };
  const removeColor = (i: number) => {
    const palette = bk.colors.palette.filter((_, idx) => idx !== i);
    onChange({ colors: { ...bk.colors, palette, ...primaryFrom(palette) } });
  };
  const addColor = () => {
    const palette = [
      ...bk.colors.palette,
      { name: "Nuevo color", hex: "#ec4899", role: "other" as const, source: "user" as const, confidence: "high" as const },
    ];
    onChange({ colors: { ...bk.colors, palette } });
  };
  const markPrimary = (i: number) => {
    const palette = bk.colors.palette.map((c, idx) => ({
      ...c,
      role: idx === i ? ("primary" as const) : c.role === "primary" ? ("other" as const) : c.role,
    }));
    onChange({ colors: { ...bk.colors, palette, ...primaryFrom(palette) } });
  };

  function primaryFrom(palette: BrandColor[]) {
    return {
      primary: palette.find((p) => p.role === "primary")?.hex,
      secondary: palette.find((p) => p.role === "secondary")?.hex,
      accent: palette.find((p) => p.role === "accent")?.hex,
      background: palette.find((p) => p.role === "background")?.hex,
      text: palette.find((p) => p.role === "text")?.hex,
    };
  }

  // Logos
  const setLogos = (logos: BrandLogo[]) => onChange({ logos });
  const selectLogo = (id: string) => setLogos(bk.logos.map((l) => ({ ...l, selected: l.id === id })));
  const removeLogo = (id: string) => setLogos(bk.logos.filter((l) => l.id !== id));
  const uploadRef = React.useRef<HTMLInputElement>(null);

  function onUpload(files: FileList | null) {
    if (!files) return;
    const readers = Array.from(files).map(
      (f) =>
        new Promise<BrandLogo>((resolve) => {
          const r = new FileReader();
          r.onload = () =>
            resolve({
              id: uid("logo"),
              type: "primary",
              dataUrl: String(r.result),
              source: "uploaded",
              selected: false,
            });
          r.readAsDataURL(f);
        })
    );
    Promise.all(readers).then((logos) => {
      const merged = [...bk.logos, ...logos];
      // si no hay ninguno seleccionado, seleccionar el primero subido
      if (!merged.some((l) => l.selected) && merged[0]) merged[0].selected = true;
      setLogos(merged);
    });
  }

  return (
    <div className="space-y-4">
      {/* Colores */}
      <Card className="space-y-3">
        <SectionTitle icon={Palette} title="Colores" hint="Tocá un color para cambiarlo. Marcá el principal con la estrella." />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {bk.colors.palette.map((c, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl border border-zinc-200 p-2">
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(c.hex) ? c.hex : "#ec4899"}
                onChange={(e) => updateColor(i, { hex: e.target.value })}
                className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-zinc-200"
                aria-label="Color"
              />
              <div className="min-w-0 flex-1">
                <input
                  value={c.name}
                  onChange={(e) => updateColor(i, { name: e.target.value })}
                  className="w-full bg-transparent text-sm font-medium outline-none"
                />
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-zinc-400">{c.hex}</span>
                  <Badge tone={c.role === "primary" ? "pink" : "default"}>{ROLE_LABELS[c.role]}</Badge>
                </div>
              </div>
              <button onClick={() => markPrimary(i)} className={c.role === "primary" ? "text-amber-500" : "text-zinc-300 hover:text-amber-500"} title="Marcar como principal">
                <Star className="h-4 w-4" fill={c.role === "primary" ? "currentColor" : "none"} />
              </button>
              <button onClick={() => removeColor(i)} className="text-zinc-300 hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={addColor}>
          <Plus className="h-4 w-4" /> Agregar color
        </Button>
      </Card>

      {/* Tipografías */}
      <Card className="space-y-3">
        <SectionTitle icon={Type} title="Tipografías" hint="Eva las detecta de tu web; si no, elegí una." />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Títulos">
            <Input
              value={bk.typography.heading?.family || ""}
              onChange={(e) =>
                onChange({ typography: { ...bk.typography, heading: { family: e.target.value, source: "user", confidence: "high" } } })
              }
              placeholder="Ej: Poppins"
            />
          </Field>
          <Field label="Texto">
            <Input
              value={bk.typography.body?.family || ""}
              onChange={(e) =>
                onChange({ typography: { ...bk.typography, body: { family: e.target.value, source: "user", confidence: "high" } } })
              }
              placeholder="Ej: Inter"
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="self-center text-xs text-zinc-400">Sugerencias:</span>
          {FONT_SUGGESTIONS.map((f) => (
            <button
              key={f}
              onClick={() => onChange({ typography: { ...bk.typography, heading: { family: f, source: "user", confidence: "high" } } })}
              className="rounded-full border border-zinc-200 px-2.5 py-0.5 text-xs text-zinc-600 hover:border-loca-300 hover:text-loca-600"
            >
              {f}
            </button>
          ))}
        </div>
      </Card>

      {/* Logos */}
      <Card className="space-y-3">
        <SectionTitle icon={ImageIcon} title="Logos y assets" hint="Si tenés más de una versión, subilas para que Eva use la correcta." />
        {bk.logos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {bk.logos.map((l) => (
              <div
                key={l.id}
                className={`relative flex aspect-square items-center justify-center rounded-xl border p-2 ${
                  l.selected ? "border-loca-500 ring-2 ring-loca-100" : "border-zinc-200"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.dataUrl || l.url} alt="logo" className="max-h-full max-w-full object-contain" />
                <button onClick={() => removeLogo(l.id)} className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-zinc-400 hover:text-red-500">
                  <Trash2 className="h-3 w-3" />
                </button>
                <button
                  onClick={() => selectLogo(l.id)}
                  className={`absolute bottom-1 left-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    l.selected ? "bg-loca-600 text-white" : "bg-white/90 text-zinc-500"
                  }`}
                >
                  {l.selected ? "Principal" : "Usar"}
                </button>
              </div>
            ))}
          </div>
        )}
        <Button size="sm" variant="outline" onClick={() => uploadRef.current?.click()}>
          <Upload className="h-4 w-4" /> Subir logo
        </Button>
        <input
          ref={uploadRef}
          type="file"
          accept=".png,.jpg,.jpeg,.svg,.webp"
          multiple
          className="hidden"
          onChange={(e) => {
            onUpload(e.target.files);
            e.target.value = "";
          }}
        />
      </Card>

      {/* Estilo visual + voz */}
      <Card className="space-y-3">
        <SectionTitle icon={Sparkles} title="Estilo y tono" hint="Cómo se ve y cómo habla tu marca." />
        <Field label="Estilo visual">
          <ChipSelect options={MOOD_OPTIONS} value={bk.visualStyle.mood} onChange={(v) => onChange({ visualStyle: { ...bk.visualStyle, mood: v } })} allowCustom />
        </Field>
        <Field label="Tono de voz">
          <ChipSelect options={TONE_OPTIONS} value={bk.voiceTone.toneTags} onChange={(v) => onChange({ voiceTone: { ...bk.voiceTone, toneTags: v } })} allowCustom />
        </Field>
        <Field label="Palabras clave de marca">
          <ChipSelect options={[]} value={bk.brandKeywords || []} onChange={(v) => onChange({ brandKeywords: v })} allowCustom />
        </Field>
        {bk.visualStyle.designNotes && (
          <Field label="Notas de estilo (de Eva)">
            <Textarea value={bk.visualStyle.designNotes} onChange={(e) => onChange({ visualStyle: { ...bk.visualStyle, designNotes: e.target.value } })} />
          </Field>
        )}
      </Card>

      {/* Avoid list */}
      <Card className="space-y-3">
        <div>
          <h3 className="font-semibold">¿Hay algo que Eva debería evitar?</h3>
          <p className="text-xs text-zinc-500">
            Marcá palabras, estilos o promesas que no querés que aparezcan en tus contenidos.
          </p>
        </div>
        <OptionCards
          multi
          columns={2}
          options={AVOID_OPTIONS.map((a) => ({ value: a, label: a }))}
          value={(bk.avoidList || []).filter((a) => AVOID_OPTIONS.includes(a))}
          onChange={(vals: string[]) => {
            const custom = (bk.avoidList || []).filter((a) => !AVOID_OPTIONS.includes(a));
            onChange({ avoidList: [...vals, ...custom] });
          }}
        />
        <Field label="Otro (opcional)">
          <ChipSelect
            options={[]}
            value={(bk.avoidList || []).filter((a) => !AVOID_OPTIONS.includes(a))}
            onChange={(custom) => {
              const fixed = (bk.avoidList || []).filter((a) => AVOID_OPTIONS.includes(a));
              onChange({ avoidList: [...fixed, ...custom] });
            }}
            allowCustom
          />
        </Field>
      </Card>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, hint }: { icon: any; title: string; hint?: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-loca-50 text-loca-600">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h3 className="font-semibold leading-tight">{title}</h3>
        {hint && <p className="text-xs text-zinc-400">{hint}</p>}
      </div>
    </div>
  );
}
