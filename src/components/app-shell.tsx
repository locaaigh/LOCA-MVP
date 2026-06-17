"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { Logo } from "@/components/brand";
import { EvaChatBubble } from "@/components/eva-chat";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Sparkles,
  CalendarDays,
  LayoutGrid,
  Megaphone,
  BarChart3,
  Settings,
  LogOut,
  Plus,
  ChevronDown,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/strategy", label: "Estrategia", icon: Sparkles },
  { href: "/content", label: "Estudio de contenidos", icon: LayoutGrid },
  { href: "/calendar", label: "Calendario", icon: CalendarDays },
  { href: "/metrics", label: "Métricas", icon: BarChart3 },
  { href: "/ads", label: "Ads", icon: Megaphone },
  { href: "/settings", label: "Configuración", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useStore((s) => s.hydrated);
  const user = useStore((s) => s.user);
  const businesses = useStore((s) => s.businesses);
  const activeId = useStore((s) => s.activeBusinessId);
  const setActive = useStore((s) => s.setActiveBusiness);
  const logout = useStore((s) => s.logout);

  useEffect(() => {
    if (hydrated && !user) router.replace("/login");
  }, [hydrated, user, router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-400">
        Cargando…
      </div>
    );
  }
  if (!user) return null;

  const active = businesses.find((b) => b.id === activeId);
  // En las pantallas de revisión hay una barra sticky de aprobación abajo:
  // elevamos la burbuja de Eva para que no la tape (mobile).
  const isReviewPage =
    pathname.startsWith("/strategy") ||
    pathname.startsWith("/calendar") ||
    pathname.startsWith("/content");

  return (
    <div className="flex min-h-screen bg-zinc-50">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-zinc-200 bg-white px-4 py-5 md:flex">
        <Link href="/dashboard" className="px-2">
          <Logo className="text-2xl" />
        </Link>

        {/* Business switcher */}
        <div className="relative mt-6">
          <label className="px-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
            Negocio
          </label>
          <div className="relative mt-1">
            <select
              value={activeId || ""}
              onChange={(e) => setActive(e.target.value)}
              className="w-full appearance-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 pr-8 text-sm font-medium"
            >
              {businesses.length === 0 && <option value="">Sin negocios</option>}
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name || "Negocio sin nombre"} {b.isDemo ? "· demo" : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          </div>
          <Link
            href="/onboarding"
            className="mt-2 flex items-center gap-1.5 px-2 text-xs font-medium text-loca-600 hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> Crear nuevo negocio
          </Link>
        </div>

        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                  isActive
                    ? "bg-loca-50 text-loca-700"
                    : "text-zinc-600 hover:bg-zinc-100"
                )}
              >
                <item.icon className="h-4.5 w-4.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-zinc-200 pt-3">
          <div className="px-2 text-xs text-zinc-400">{user.email}</div>
          <button
            onClick={() => {
              logout();
              router.replace("/login");
            }}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
          >
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 md:hidden">
          <Logo className="text-xl" />
          <select
            value={activeId || ""}
            onChange={(e) => setActive(e.target.value)}
            className="rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
          >
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name || "Negocio"}
              </option>
            ))}
          </select>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-zinc-200 bg-white px-2 py-2 md:hidden">
          {NAV.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium",
                  isActive ? "bg-loca-50 text-loca-700" : "text-zinc-600"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8">
          {!active && pathname !== "/settings" ? (
            <NoBusiness />
          ) : (
            <div className="mx-auto max-w-6xl">{children}</div>
          )}
        </main>
      </div>

      <EvaChatBubble raised={isReviewPage} />
    </div>
  );
}

function NoBusiness() {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center">
      <h2 className="text-lg font-semibold">No tenés ningún negocio todavía</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Completá el formulario para que Eva empiece a trabajar.
      </p>
      <Link
        href="/onboarding"
        className="mt-5 inline-block rounded-lg bg-loca-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-loca-700"
      >
        Completá tu negocio
      </Link>
    </div>
  );
}
