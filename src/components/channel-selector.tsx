"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { MARKETING_CHANNELS } from "@/lib/constants";
import {
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  Twitter,
  Music2,
  Image as ImageIcon,
  MessageCircle,
  Mail,
  FileText,
  MapPin,
  Ban,
  Check,
} from "lucide-react";

// Mapeo id → ícono (lucide). Para marcas sin ícono exacto usamos un fallback razonable.
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  facebook: Facebook,
  tiktok: Music2,
  linkedin: Linkedin,
  x: Twitter,
  pinterest: ImageIcon,
  youtube: Youtube,
  google: MapPin,
  whatsapp: MessageCircle,
  email: Mail,
  blog: FileText,
  none: Ban,
};

// Selección de canales como cards/badges con ícono.
// value/onChange operan sobre los LABELS (strings legibles), que es lo que persiste el negocio.
export function ChannelSelector({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (label: string) => {
    if (label === "Ninguno") {
      onChange(value.includes("Ninguno") ? [] : ["Ninguno"]);
      return;
    }
    const withoutNone = value.filter((v) => v !== "Ninguno");
    onChange(
      withoutNone.includes(label)
        ? withoutNone.filter((v) => v !== label)
        : [...withoutNone, label]
    );
  };

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {MARKETING_CHANNELS.map((ch) => {
        const Icon = ICONS[ch.id] || ImageIcon;
        const active = value.includes(ch.label);
        return (
          <button
            key={ch.id}
            type="button"
            onClick={() => toggle(ch.label)}
            className={cn(
              "flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition",
              active
                ? "border-loca-400 bg-loca-50 text-loca-700 ring-2 ring-loca-100"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
            )}
          >
            <Icon className={cn("h-5 w-5 shrink-0", active ? "text-loca-600" : "text-zinc-400")} />
            <span className="min-w-0 flex-1 truncate">{ch.label}</span>
            {active && <Check className="h-4 w-4 shrink-0 text-loca-600" />}
          </button>
        );
      })}
    </div>
  );
}
