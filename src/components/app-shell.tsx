"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { useMonthContentGenerating } from "@/lib/generators";
import { signOutSupabase } from "@/lib/auth/session";
import { hasSupabaseClientConfig } from "@/lib/supabase/client";
import { Logo } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { EvaChatBubble } from "@/components/eva-chat";
import { StrategyJobTracker } from "@/components/strategy-job-tracker";
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
  Loader2,
  MoreHorizontal,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", short: "Inicio", icon: LayoutDashboard },
  { href: "/strategy", label: "Estrategia", short: "Estrategia", icon: Sparkles },
  { href: "/content", label: "Estudio de contenidos", short: "Contenidos", icon: Clapperboard },
  { href: "/calendar", label: "Calendario", short: "Calendario", icon: CalendarDays },
  { href: "/metrics", label: "Métricas", short: "Métricas", icon: BarChart3 },
  { href: "/ads", label: "Ads", short: "Ads", icon: Megaphone },
  { href: "/settings", label: "Configuración", short: "Config", icon: Settings },
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
  const strategyGenerating = useStore((s) => {
    const id = s.activeBusinessId;
    if (!id) return false;
    const biz = s.businesses.find((b) => b.id === id);
    return biz?.strategyJob?.status === "generating";
  });
  const contentGenerating = useMonthContentGenerating(activeId);

  useEffect(() => {
    if (hydrated && !user) router.replace("/login");
  }, [hydrated, user, router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-subtle text-sm text-muted-foreground">
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
      <aside className="hidden w-72 shrink-0 flex-col border-r border-border/70 bg-card-glass/80 px-5 py-6 backdrop-blur-sm md:sticky md:top-0 md:flex md:h-screen md:overflow-y-auto">
        <Link href="/dashboard" className="px-2">
          <Logo className="text-2xl" />
        </Link>

        {/* Business switcher */}
        <div className="relative mt-7">
          <label className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Negocio
          </label>
          <div className="relative mt-2">
            <select
              value={activeId || ""}
              onChange={(e) => setActive(e.target.value)}
              aria-label="Cambiar de negocio"
              className="w-full appearance-none rounded-2xl border border-border bg-surface-subtle/80 px-4 py-3 pr-9 text-sm font-semibold text-foreground-soft outline-none transition hover:border-border-strong focus:border-loca-400 focus:ring-4 focus:ring-accent-subtle-ring"
            >
              {businesses.length === 0 && <option value="">Sin negocios</option>}
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name || "Negocio sin nombre"} {b.isDemo ? "· demo" : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          </div>
          <Link
            href="/onboarding"
            className="mt-2.5 flex items-center gap-1.5 px-1 text-xs font-semibold text-accent transition hover:text-accent-subtle-fg"
          >
            <Plus className="h-3.5 w-3.5" /> Crear nuevo negocio
          </Link>
        </div>

        <p className="mb-2 mt-8 px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Menú</p>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-loca-300",
                  isActive
                    ? "bg-gradient-to-r from-loca-50 to-loca-100/30 dark:from-accent-subtle-bg dark:to-accent-subtle-bg/40 text-accent-subtle-fg shadow-sm ring-1 ring-accent-subtle-ring"
                    : "text-muted-foreground hover:bg-surface-muted/70 hover:text-foreground"
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-loca-400 to-loca-600" />
                )}
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition",
                    isActive ? "bg-card text-accent shadow-sm" : "text-faint group-hover:text-muted-foreground-2"
                  )}
                >
                  <item.icon className="h-[18px] w-[18px]" />
                </span>
                {item.label}
                {item.href === "/strategy" && strategyGenerating && (
                  <Loader2 className="ml-auto h-4 w-4 animate-spin text-loca-500" />
                )}
                {item.href === "/content" && contentGenerating && (
                  <Loader2 className="ml-auto h-4 w-4 animate-spin text-loca-500" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-3 border-t border-border/70 pt-3">
          <ThemeToggle className="mb-2" />
          <div className="truncate px-2 text-xs text-muted-foreground">{user.email}</div>
          <button
            onClick={async () => {
              if (hasSupabaseClientConfig()) {
                await signOutSupabase();
              }
              logout();
              router.replace("/login");
            }}
            className="mt-1 flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-surface-muted/80 hover:text-foreground"
          >
            <LogOut className="h-4.5 w-4.5 text-faint" /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile: header arriba, bottom tab bar abajo */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-border/70 bg-card-glass/90 px-4 py-3 backdrop-blur-md md:hidden">
          <Logo className="text-xl" />
          <div className="flex min-w-0 items-center gap-2">
            <ThemeToggle />
            <select
              value={activeId || ""}
              onChange={(e) => setActive(e.target.value)}
              aria-label="Cambiar de negocio"
              className="min-w-0 max-w-[45vw] truncate rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground-muted"
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name || "Negocio"}
                </option>
              ))}
            </select>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-7 pb-24 sm:px-10 sm:py-9 md:pb-9">
          {!active && pathname !== "/settings" ? (
            <NoBusiness />
          ) : (
            <div className="mx-auto max-w-6xl">{children}</div>
          )}
        </main>
      </div>

      <MobileTabBar
        pathname={pathname}
        strategyGenerating={strategyGenerating}
        contentGenerating={contentGenerating}
      />
      <EvaChatBubble raised={isReviewPage} />
      <StrategyJobTracker />
    </div>
  );
}

// Bottom tab bar (mobile): 4 secciones + "Más" (sheet con el resto).
function MobileTabBar({
  pathname,
  strategyGenerating,
  contentGenerating,
}: {
  pathname: string;
  strategyGenerating: boolean;
  contentGenerating: boolean;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = NAV.slice(0, 4);
  const more = NAV.slice(4);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const moreActive = more.some((m) => isActive(m.href));

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-overlay/30" />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-card p-4 pb-8 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
            {more.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold",
                  isActive(item.href) ? "bg-accent-subtle-bg text-accent-subtle-fg" : "text-foreground-muted hover:bg-surface-subtle"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-border/70 bg-card-glass/95 backdrop-blur-md md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {primary.map((item) => {
          const active = isActive(item.href);
          const busy =
            (item.href === "/strategy" && strategyGenerating) ||
            (item.href === "/content" && contentGenerating);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-loca-300",
                active ? "text-accent-subtle-fg" : "text-muted-foreground"
              )}
            >
              {active && <span className="absolute top-0 h-0.5 w-10 rounded-full bg-loca-500" />}
              {busy ? <Loader2 className="h-5 w-5 animate-spin text-loca-500" /> : <item.icon className="h-5 w-5" />}
              {item.short}
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen((v) => !v)}
          aria-label="Más secciones"
          className={cn(
            "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-loca-300",
            moreActive || moreOpen ? "text-accent-subtle-fg" : "text-muted-foreground"
          )}
        >
          <MoreHorizontal className="h-5 w-5" />
          Más
        </button>
      </nav>
    </>
  );
}

function NoBusiness() {
  return (
    <div className="mx-auto mt-10 max-w-md rounded-3xl border border-border/70 bg-card p-10 text-center shadow-card">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-subtle-bg text-accent shadow-glow">
        <Plus className="h-6 w-6" />
      </div>
      <h2 className="mt-5 text-xl font-bold text-foreground">Todavía no tenés un negocio</h2>
      <p className="mt-2 text-[15px] text-muted-foreground">
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
