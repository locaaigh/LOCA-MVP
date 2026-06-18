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
  Clapperboard,
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
  { href: "/content", label: "Estudio de contenidos", icon: Clapperboard },
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
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-zinc-200/70 bg-white/80 px-5 py-6 backdrop-blur-sm md:sticky md:top-0 md:flex md:h-screen md:overflow-y-auto">
        <Link href="/dashboard" className="px-2">
          <Logo className="text-2xl" />
        </Link>

        {/* Business switcher */}
        <div className="relative mt-7">
          <label className="px-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Negocio
          </label>
          <div className="relative mt-2">
            <select
              value={activeId || ""}
              onChange={(e) => setActive(e.target.value)}
              className="w-full appearance-none rounded-2xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 pr-9 text-sm font-semibold text-zinc-800 outline-none transition hover:border-zinc-300 focus:border-loca-400 focus:ring-4 focus:ring-loca-100"
            >
              {businesses.length === 0 && <option value="">Sin negocios</option>}
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name || "Negocio sin nombre"} {b.isDemo ? "· demo" : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          </div>
          <Link
            href="/onboarding"
            className="mt-2.5 flex items-center gap-1.5 px-1 text-xs font-semibold text-loca-600 transition hover:text-loca-700"
          >
            <Plus className="h-3.5 w-3.5" /> Crear nuevo negocio
          </Link>
        </div>

        <nav className="mt-7 flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-all",
                  isActive
                    ? "bg-loca-50 text-loca-700 shadow-sm ring-1 ring-loca-100"
                    : "text-zinc-500 hover:bg-zinc-100/80 hover:text-zinc-900"
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-loca-500" />
                )}
                <item.icon className={cn("h-5 w-5 shrink-0 transition", isActive ? "text-loca-600" : "text-zinc-400 group-hover:text-zinc-600")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-3 border-t border-zinc-200/70 pt-3">
          <div className="truncate px-2 text-xs text-zinc-400">{user.email}</div>
          <button
            onClick={() => {
              logout();
              router.replace("/login");
            }}
            className="mt-1 flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-zinc-500 transition hover:bg-zinc-100/80 hover:text-zinc-900"
          >
            <LogOut className="h-4.5 w-4.5 text-zinc-400" /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-zinc-200/70 bg-white/90 px-4 py-3 backdrop-blur-md md:hidden">
          <Logo className="text-xl" />
          <select
            value={activeId || ""}
            onChange={(e) => setActive(e.target.value)}
            className="rounded-xl border border-zinc-200 px-3 py-2 text-sm font-medium"
          >
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name || "Negocio"}
              </option>
            ))}
          </select>
        </header>
        <nav className="sticky top-[57px] z-20 flex gap-1.5 overflow-x-auto border-b border-zinc-200/70 bg-white/90 px-3 py-2.5 backdrop-blur-md md:hidden">
          {NAV.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                  isActive ? "bg-loca-50 text-loca-700 ring-1 ring-loca-100" : "text-zinc-500"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="min-w-0 flex-1 px-4 py-7 sm:px-10 sm:py-9">
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
    <div className="mx-auto mt-10 max-w-md rounded-3xl border border-zinc-200/70 bg-white p-10 text-center shadow-card">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-loca-50 text-loca-600 shadow-glow">
        <Plus className="h-6 w-6" />
      </div>
      <h2 className="mt-5 text-xl font-bold text-zinc-900">Todavía no tenés un negocio</h2>
      <p className="mt-2 text-[15px] text-zinc-500">
        Contale a Eva sobre tu negocio y ella arma todo por vos.
      </p>
      <Link
        href="/onboarding"
        className="mt-6 inline-flex h-12 items-center rounded-2xl bg-loca-600 px-7 text-[15px] font-semibold text-white shadow-sm transition hover:bg-loca-700 hover:shadow-lift"
      >
        Empezar con Eva
      </Link>
    </div>
  );
}
