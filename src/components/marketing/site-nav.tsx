"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand";
import { NAV_LINKS, appHref } from "@/lib/marketing/config";

/** Nav superior de la web de marketing (heyloca.ai). */
export function SiteNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-white/40 dark:border-border/60 bg-card/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-6">
        <Link href="/" aria-label="LOCA — inicio" className="transition hover:opacity-80">
          <Logo className="text-2xl" />
        </Link>

        {/* Desktop */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-xl px-3.5 py-2 text-sm font-medium text-muted-foreground-2 transition hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
          <a
            href={appHref("/login")}
            className="ml-1 rounded-xl px-3.5 py-2 text-sm font-medium text-muted-foreground-2 transition hover:text-foreground"
          >
            Iniciar sesión
          </a>
          <a
            href={appHref("/onboarding")}
            data-ph-capture-attribute-cta="nav-onboarding"
            className="ml-1 rounded-2xl bg-loca-600 px-4 py-2 text-sm font-semibold text-white shadow-lift transition hover:bg-loca-700"
          >
            Empezar
          </a>
        </nav>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          className="rounded-xl p-2 text-foreground-soft transition hover:bg-surface-muted md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-border/60 bg-card/95 px-5 py-4 backdrop-blur md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-foreground-soft transition hover:bg-surface-muted"
              >
                {l.label}
              </Link>
            ))}
            <a
              href={appHref("/login")}
              className="rounded-xl px-3 py-2.5 text-sm font-medium text-foreground-soft transition hover:bg-surface-muted"
            >
              Iniciar sesión
            </a>
            <a
              href={appHref("/onboarding")}
              data-ph-capture-attribute-cta="nav-mobile-onboarding"
              className="mt-1 rounded-2xl bg-loca-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-lift transition hover:bg-loca-700"
            >
              Empezar
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
