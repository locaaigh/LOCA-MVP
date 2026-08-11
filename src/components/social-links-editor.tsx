"use client";

import { Button, Input } from "@/components/ui";
import type { Business, SocialLink } from "@/lib/types";
import { Plus, Trash2, ExternalLink } from "lucide-react";

// Editor de links de redes. Eva los detecta de la web (businessIntelligence.
// socialLinks) pero no se mostraban; acá quedan visibles, editables y con URL.
// Ver PLAN-v2 item 2. Principio: no inventamos; si falta, lo completás vos.
export function SocialLinksEditor({
  business,
  onChange,
}: {
  business: Business;
  onChange: (links: SocialLink[]) => void;
}) {
  const links = business.businessIntelligence?.socialLinks || [];
  const update = (i: number, patch: Partial<SocialLink>) =>
    onChange(links.map((l, idx) => (idx === i ? { ...l, ...patch, source: "user" as const } : l)));
  const remove = (i: number) => onChange(links.filter((_, idx) => idx !== i));
  const add = () => onChange([...links, { platform: "", url: "", source: "user", confidence: "high" }]);

  return (
    <div className="space-y-2.5">
      {links.length === 0 && (
        <p className="text-sm text-faint">Todavía no hay redes cargadas. Sumá las tuyas para que Eva las asocie a tu perfil.</p>
      )}
      {links.map((l, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={l.platform}
            onChange={(e) => update(i, { platform: e.target.value })}
            placeholder="Red (ej: Instagram)"
            className="w-36 shrink-0"
          />
          <Input
            value={l.url}
            onChange={(e) => update(i, { url: e.target.value })}
            placeholder="https://…"
          />
          {l.url?.startsWith("http") && (
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-lg p-2 text-faint transition hover:bg-surface-subtle hover:text-accent"
              aria-label="Abrir link"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <button
            onClick={() => remove(i)}
            className="shrink-0 rounded-lg p-2 text-faint transition hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 dark:hover:text-red-400"
            aria-label="Eliminar red"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={add}>
        <Plus className="h-4 w-4" /> Agregar red
      </Button>
    </div>
  );
}
