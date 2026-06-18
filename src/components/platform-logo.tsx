"use client";

import { cn } from "@/lib/utils";

// Logos de marca (SVG inline) para mostrar la plataforma con su ícono real
// en vez de texto. La lógica de canales no cambia: solo presentación.

type Tone = "color" | "mono";

function normalize(name: string): string {
  const n = (name || "").toLowerCase().trim();
  if (n.includes("insta")) return "instagram";
  if (n.includes("face")) return "facebook";
  if (n.includes("tiktok") || n.includes("tik tok")) return "tiktok";
  if (n.includes("linkedin")) return "linkedin";
  if (n === "x" || n.includes("twitter")) return "x";
  if (n.includes("youtube")) return "youtube";
  if (n.includes("pinterest")) return "pinterest";
  if (n.includes("whatsapp")) return "whatsapp";
  if (n.includes("google")) return "google";
  if (n.includes("email") || n.includes("mail")) return "email";
  if (n.includes("blog")) return "blog";
  return "generic";
}

const BRAND: Record<string, { label: string; bg: string; fg: string }> = {
  instagram: { label: "Instagram", bg: "bg-gradient-to-br from-[#feda75] via-[#d62976] to-[#4f5bd5]", fg: "text-white" },
  facebook: { label: "Facebook", bg: "bg-[#1877f2]", fg: "text-white" },
  tiktok: { label: "TikTok", bg: "bg-black", fg: "text-white" },
  linkedin: { label: "LinkedIn", bg: "bg-[#0a66c2]", fg: "text-white" },
  x: { label: "X", bg: "bg-black", fg: "text-white" },
  youtube: { label: "YouTube", bg: "bg-[#ff0000]", fg: "text-white" },
  pinterest: { label: "Pinterest", bg: "bg-[#e60023]", fg: "text-white" },
  whatsapp: { label: "WhatsApp", bg: "bg-[#25d366]", fg: "text-white" },
  google: { label: "Google", bg: "bg-white ring-1 ring-zinc-200", fg: "text-zinc-700" },
  email: { label: "Email", bg: "bg-zinc-800", fg: "text-white" },
  blog: { label: "Blog", bg: "bg-loca-600", fg: "text-white" },
  generic: { label: "Canal", bg: "bg-loca-600", fg: "text-white" },
};

function Glyph({ id }: { id: string }) {
  const c = "currentColor";
  switch (id) {
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-[58%] w-[58%]">
          <rect x="3" y="3" width="18" height="18" rx="5" stroke={c} strokeWidth="2" />
          <circle cx="12" cy="12" r="4" stroke={c} strokeWidth="2" />
          <circle cx="17.5" cy="6.5" r="1.3" fill={c} />
        </svg>
      );
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" fill={c} className="h-[64%] w-[64%]">
          <path d="M13.5 21v-7h2.3l.4-2.7h-2.7V9.5c0-.8.3-1.3 1.4-1.3h1.4V5.8c-.7-.1-1.4-.1-2.1-.1-2.1 0-3.5 1.3-3.5 3.6v2H8.3V14h2.3v7h2.9z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg viewBox="0 0 24 24" fill={c} className="h-[58%] w-[58%]">
          <path d="M16.5 3c.3 2.1 1.5 3.4 3.5 3.6v2.5c-1.2.1-2.3-.3-3.5-1v5.7c0 3.4-2.6 5.7-5.6 5.2-2.6-.4-4-2.5-3.7-4.9.3-2.2 2.3-3.7 4.6-3.5v2.6c-.4-.1-.8-.2-1.2-.1-1 .1-1.6.9-1.5 1.9.1.9.9 1.6 1.9 1.5 1-.1 1.6-.9 1.6-2V3h3.4z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg viewBox="0 0 24 24" fill={c} className="h-[58%] w-[58%]">
          <path d="M7 9.5H4.5V20H7V9.5zM5.7 5.2A1.5 1.5 0 105.7 8.2 1.5 1.5 0 005.7 5.2zM20 20h-2.5v-5.3c0-1.3-.5-2.1-1.6-2.1-.9 0-1.4.6-1.6 1.2-.1.2-.1.5-.1.8V20H11.7s.1-9.5 0-10.5h2.5v1.5c.3-.5 1-1.3 2.4-1.3 1.7 0 3.1 1.1 3.1 3.6V20z" />
        </svg>
      );
    case "x":
      return (
        <svg viewBox="0 0 24 24" fill={c} className="h-[52%] w-[52%]">
          <path d="M17.5 3h3l-6.6 7.6L21.7 21h-5.6l-4.4-5.8L6.7 21H3.6l7-8.1L2.6 3h5.7l4 5.3L17.5 3zm-1 16h1.6L7.6 4.6H5.9L16.5 19z" />
        </svg>
      );
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" fill={c} className="h-[60%] w-[60%]">
          <path d="M21.6 8.2c-.2-1-.9-1.7-1.9-2C18 5.8 12 5.8 12 5.8s-6 0-7.7.4c-1 .3-1.7 1-1.9 2C2 9.9 2 12 2 12s0 2.1.4 3.8c.2 1 .9 1.7 1.9 2 1.7.4 7.7.4 7.7.4s6 0 7.7-.4c1-.3 1.7-1 1.9-2C22 14.1 22 12 22 12s0-2.1-.4-3.8zM10 15V9l5 3-5 3z" />
        </svg>
      );
    case "pinterest":
      return (
        <svg viewBox="0 0 24 24" fill={c} className="h-[60%] w-[60%]">
          <path d="M12 3a9 9 0 00-3.3 17.4c-.1-.7-.1-1.8 0-2.6l1-4.3s-.3-.5-.3-1.3c0-1.2.7-2.1 1.6-2.1.7 0 1.1.6 1.1 1.3 0 .8-.5 2-.8 3.1-.2.9.5 1.6 1.4 1.6 1.6 0 2.8-1.7 2.8-4.2 0-2.2-1.6-3.7-3.8-3.7-2.6 0-4.1 1.9-4.1 3.9 0 .8.3 1.6.7 2 .1.1.1.2 0 .3l-.2 1c-.1.2-.2.3-.4.2-1.2-.6-2-2.4-2-3.8 0-3.1 2.2-5.9 6.5-5.9 3.4 0 6.1 2.4 6.1 5.7 0 3.4-2.2 6.2-5.2 6.2-1 0-2-.5-2.3-1.2l-.6 2.4c-.2.9-.8 1.9-1.2 2.6A9 9 0 1012 3z" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg viewBox="0 0 24 24" fill={c} className="h-[60%] w-[60%]">
          <path d="M12 3a9 9 0 00-7.7 13.6L3 21l4.5-1.2A9 9 0 1012 3zm0 16.4c-1.4 0-2.8-.4-4-1.1l-.3-.2-2.7.7.7-2.6-.2-.3a7.4 7.4 0 1113.2-4.6 7.4 7.4 0 01-6.7 8.1zm4.1-5.5c-.2-.1-1.3-.7-1.5-.7-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1-1-.4-1.8-1-2.5-2-.2-.3.2-.3.5-.9.1-.1 0-.3 0-.4l-.7-1.6c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.7.7-.9 1.6-.6 2.6.4 1.4 1.4 2.6 2.9 3.5 2 1.2 2.8 1 3.3.9.5-.1 1.3-.6 1.5-1.1.2-.5.2-1 .1-1.1l-.4-.5z" />
        </svg>
      );
    case "google":
      return (
        <svg viewBox="0 0 24 24" className="h-[58%] w-[58%]">
          <path fill="#4285F4" d="M21.6 12.2c0-.6-.1-1.2-.2-1.8H12v3.5h5.4a4.6 4.6 0 01-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.2z" />
          <path fill="#34A853" d="M12 22c2.7 0 4.9-.9 6.6-2.4l-3.2-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.7-5.6-4.1H3.1v2.6A10 10 0 0012 22z" />
          <path fill="#FBBC05" d="M6.4 13.9a6 6 0 010-3.8V7.5H3.1a10 10 0 000 9l3.3-2.6z" />
          <path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 003.1 7.5l3.3 2.6C7.2 7.7 9.4 6 12 6z" />
        </svg>
      );
    case "email":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-[58%] w-[58%]">
          <rect x="3" y="5" width="18" height="14" rx="2.5" stroke={c} strokeWidth="2" />
          <path d="M4 7l8 5 8-5" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "blog":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-[58%] w-[58%]">
          <path d="M5 4h9l5 5v11a1 1 0 01-1 1H6a1 1 0 01-1-1V4z" stroke={c} strokeWidth="2" strokeLinejoin="round" />
          <path d="M8 12h8M8 16h5" stroke={c} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-[55%] w-[55%]">
          <circle cx="12" cy="12" r="8" stroke={c} strokeWidth="2" />
        </svg>
      );
  }
}

/** Ícono de plataforma con su color de marca. */
export function PlatformLogo({
  channel,
  size = 32,
  tone = "color",
  className,
}: {
  channel: string;
  size?: number;
  tone?: Tone;
  className?: string;
}) {
  const id = normalize(channel);
  const brand = BRAND[id] || BRAND.generic;
  return (
    <span
      aria-label={brand.label}
      title={brand.label}
      className={cn(
        "inline-flex items-center justify-center rounded-xl",
        tone === "color" ? cn(brand.bg, brand.fg) : "bg-zinc-100 text-zinc-600",
        className
      )}
      style={{ width: size, height: size }}
    >
      <Glyph id={id} />
    </span>
  );
}

/**
 * Plataformas donde se publica un contenido (crosspost).
 * Usa las explícitas si existen; si no, infiere: Instagram → +Facebook
 * cuando el negocio también usa Facebook. No duplica.
 */
export function contentPlatforms(
  channel: string,
  distributionPlatforms?: string[],
  businessChannels?: string[]
): string[] {
  const out: string[] = [channel];
  const add = (p: string) => {
    if (!out.some((x) => normalize(x) === normalize(p))) out.push(p);
  };
  (distributionPlatforms || []).forEach(add);
  // Inferencia por defecto (solo si no se definieron explícitas).
  if (!distributionPlatforms?.length) {
    const usesFacebook = (businessChannels || []).some((c) => /face/i.test(c));
    if (normalize(channel) === "instagram" && usesFacebook) add("Facebook");
  }
  return out;
}

/** Pila de logos de plataformas (crosspost). */
export function PlatformLogos({
  channels,
  size = 30,
  className,
}: {
  channels: string[];
  size?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      {channels.map((c, i) => (
        <PlatformLogo
          key={c + i}
          channel={c}
          size={size}
          className={i > 0 ? "-ml-1.5 ring-2 ring-white" : ""}
        />
      ))}
    </span>
  );
}

/** Logo + nombre (cuando hace falta texto secundario). */
export function PlatformTag({
  channel,
  size = 28,
  className,
}: {
  channel: string;
  size?: number;
  className?: string;
}) {
  const id = normalize(channel);
  const brand = BRAND[id] || BRAND.generic;
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <PlatformLogo channel={channel} size={size} />
      <span className="text-sm font-semibold text-zinc-700">{brand.label}</span>
    </span>
  );
}
