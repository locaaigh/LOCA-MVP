"use client";

import { VISUAL_STYLES, type VisualStyleId } from "@/lib/constants";
import { Check } from "lucide-react";

// Ejemplo visual representativo por estilo (CSS puro, swappable por imágenes
// reales más adelante). Ver PLAN-v2 item 16.
const STYLE_PREVIEW: Record<VisualStyleId, React.CSSProperties> = {
  fotorrealista: { background: "radial-gradient(120% 120% at 30% 20%, #fde68a 0%, #f59e0b 35%, #7c2d12 100%)" },
  render_3d: { background: "radial-gradient(circle at 35% 30%, #ffffff 0%, #a78bfa 30%, #4c1d95 100%)" },
  vectorial: { background: "linear-gradient(135deg, #22d3ee 0 33%, #f472b6 33% 66%, #facc15 66% 100%)" },
  minimalista_tipografico: { background: "#f4f4f5" },
  ilustracion_artistica: { background: "conic-gradient(from 200deg at 60% 40%, #fca5a5, #fdba74, #a7f3d0, #93c5fd, #fca5a5)" },
  cartoon_anime: { background: "linear-gradient(160deg, #38bdf8 0%, #f472b6 100%)" },
  cinematografico: { background: "linear-gradient(180deg, #0f172a 0%, #334155 55%, #0f172a 100%)" },
};

function StylePreview({ id }: { id: VisualStyleId }) {
  return (
    <div className="relative h-20 w-full overflow-hidden rounded-xl" style={STYLE_PREVIEW[id]}>
      {id === "minimalista_tipografico" && (
        <span className="absolute inset-0 flex items-center justify-center text-2xl font-black tracking-tight text-foreground">
          Aa
        </span>
      )}
      {id === "cinematografico" && (
        <>
          <span className="absolute inset-x-0 top-0 h-2.5 bg-black" />
          <span className="absolute inset-x-0 bottom-0 h-2.5 bg-black" />
        </>
      )}
      {id === "vectorial" && <span className="absolute left-2 top-2 h-6 w-6 rounded-full bg-card/80" />}
    </div>
  );
}

/**
 * Selección múltiple de estilos visuales. Define cómo se piensan y arman los
 * contenidos. Cards cuadradas con ejemplo. Ver PLAN-v2 item 16.
 */
export function VisualStylePicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {VISUAL_STYLES.map((s) => {
        const selected = value.includes(s.id);
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => toggle(s.id)}
            className={`relative rounded-2xl border-2 p-2 text-left transition ${
              selected ? "border-loca-500 bg-accent-subtle-bg shadow-sm" : "border-border/70 bg-card hover:border-border-strong"
            }`}
          >
            {selected && (
              <span className="absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-loca-600 text-white">
                <Check className="h-3 w-3" />
              </span>
            )}
            <StylePreview id={s.id} />
            <p className="mt-2 text-sm font-semibold leading-tight text-foreground-soft">{s.label}</p>
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{s.description}</p>
          </button>
        );
      })}
    </div>
  );
}
