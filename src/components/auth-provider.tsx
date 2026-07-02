"use client";

import { useEffect, useRef } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { getSupabaseBrowser, hasSupabaseClientConfig } from "@/lib/supabase/client";
import { useStore } from "@/lib/store";
import type { User } from "@/lib/types";

function toLocaUser(u: SupabaseUser): User {
  return {
    id: u.id,
    email: u.email || "",
    name: (u.user_metadata?.name as string) || u.email?.split("@")[0] || "Usuario",
    createdAt: u.created_at,
  };
}

/** Trae los datos del usuario desde Supabase y los mete en el store. */
async function hydrateFromServer() {
  try {
    const res = await fetch("/api/snapshot");
    if (!res.ok) return;
    const snap = await res.json();
    useStore.getState().hydrateFromServer(snap);
  } catch {
    /* sin conexión: seguimos con los datos locales */
  }
}

/**
 * Mantiene el usuario del store sincronizado con la sesión de Supabase
 * y trae los datos del servidor al iniciar sesión.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const hydratedOnce = useRef(false);

  useEffect(() => {
    if (!hasSupabaseClientConfig()) return;
    const supabase = getSupabaseBrowser();

    supabase.auth.getUser().then(({ data }) => {
      const current = useStore.getState().user;
      if (data.user) {
        useStore.getState().setUser(toLocaUser(data.user));
        if (!hydratedOnce.current) {
          hydratedOnce.current = true;
          void hydrateFromServer();
        }
      } else if (current && !current.isDemo) {
        // Había un usuario "real" guardado pero no hay sesión: limpiar.
        useStore.getState().setUser(null);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        useStore.getState().setUser(toLocaUser(session.user));
        if (!hydratedOnce.current) {
          hydratedOnce.current = true;
          void hydrateFromServer();
        }
      }
      if (event === "SIGNED_OUT") {
        hydratedOnce.current = false;
        useStore.getState().logout();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return <>{children}</>;
}
