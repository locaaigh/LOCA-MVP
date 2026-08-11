"use client";

import { useId } from "react";
import Link from "next/link";

/** Checkbox de aceptación de Términos y Política de Privacidad (obligatorio en el registro). */
export function TermsCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm text-muted-foreground-2">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        required
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-border-strong text-loca-600 accent-loca-600 focus:ring-2 focus:ring-accent-subtle-ring"
      />
      <span>
        Acepto los{" "}
        <Link href="/legal/terms" target="_blank" className="font-semibold text-accent hover:underline">
          Términos y Condiciones
        </Link>{" "}
        y la{" "}
        <Link href="/legal/privacy" target="_blank" className="font-semibold text-accent hover:underline">
          Política de Privacidad
        </Link>
        .
      </span>
    </label>
  );
}
