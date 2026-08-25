// ─────────────────────────────────────────────────────────────
// Logos oficiales de marca como SVG inline, con sus colores
// originales. NO recolorear ni aplicar filtros (guía de marca de
// cada plataforma). Reciben className solo para el tamaño.
// ─────────────────────────────────────────────────────────────
import { useId } from "react";

/** Logo de Instagram: glifo de cámara sobre el gradiente oficial. */
export function InstagramLogo({ className }: { className?: string }) {
  // id único por instancia: si el logo se renderiza más de una vez en la
  // página, gradientes con el mismo id se pisarían.
  const gid = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 24 24" className={className} role="img" aria-label="Instagram">
      <defs>
        <linearGradient id={gid} x1="1.5" y1="22.5" x2="22.5" y2="1.5" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FED576" />
          <stop offset="0.26" stopColor="#F47133" />
          <stop offset="0.61" stopColor="#BC3081" />
          <stop offset="1" stopColor="#4C63D2" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="22" height="22" rx="6" fill={`url(#${gid})`} />
      <rect x="6" y="6" width="12" height="12" rx="4" fill="none" stroke="#fff" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3" fill="none" stroke="#fff" strokeWidth="1.6" />
      <circle cx="16.2" cy="7.8" r="1.15" fill="#fff" />
    </svg>
  );
}

/** Logo de Facebook: roundel azul de marca con la "f" blanca. */
export function FacebookLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} role="img" aria-label="Facebook">
      <circle cx="12" cy="12" r="11" fill="#1877F2" />
      <path
        d="M15.12 12.75 15.47 10.46 13.27 10.46 13.27 8.97C13.27 8.35 13.58 7.74 14.56 7.74L15.56 7.74 15.56 5.79C15.56 5.79 14.65 5.63 13.79 5.63C11.99 5.63 10.81 6.72 10.81 8.71L10.81 10.46 8.8 10.46 8.8 12.75 10.81 12.75 10.81 18.29 13.27 18.29 13.27 12.75Z"
        fill="#fff"
      />
    </svg>
  );
}
