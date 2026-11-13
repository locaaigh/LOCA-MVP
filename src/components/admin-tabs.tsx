"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/onboarding-fields", label: "Campos del onboarding" },
  { href: "/admin/ai-analysis", label: "Análisis de IA" },
];

export function AdminTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1">
      {TABS.map((t) => {
        const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
              active
                ? "bg-loca-500 text-white"
                : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
