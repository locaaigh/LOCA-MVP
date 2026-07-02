"use client";

import { useEffect, useRef } from "react";
import { getSupabaseBrowser, hasSupabaseClientConfig } from "@/lib/supabase/client";
import { establishAuthenticatedUser } from "@/lib/auth/session";
import { useStore } from "@/lib/store";
import { syncRepositoryToServer } from "@/lib/repository/client-sync";

/**
 * Mantiene el usuario del store sincronizado con la sesión de Supabase
 * y trae los datos del servidor al iniciar sesión.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const lastAuthUserId = useRef<string | null>(null);

  // Sync automático (debounced): persiste aprobaciones y cambios de estado
  // que no pasan por una llamada de IA (p. ej. "Aprobar todo").
  useEffect(() => {
    if (!hasSupabaseClientConfig()) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = useStore.subscribe((state, prev) => {
      if (!state.user || state.user.isDemo) return;
      if (
        state.contents === prev.contents &&
        state.flows === prev.flows &&
        state.strategies === prev.strategies &&
        state.calendars === prev.calendars &&
        state.businesses === prev.businesses
      )
        return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        syncRepositoryToServer().catch(() => {
          /* reintenta en el próximo cambio */
        });
      }, 2500);
    });
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!hasSupabaseClientConfig()) return;
    const supabase = getSupabaseBrowser();

    supabase.auth.getUser().then(({ data }) => {
      const current = useStore.getState().user;
      if (data.user) {
        if (lastAuthUserId.current !== data.user.id) {
          lastAuthUserId.current = data.user.id;
          void establishAuthenticatedUser(data.user);
        }
      } else if (current && !current.isDemo) {
        // Había un usuario real guardado pero no hay sesión: limpiar.
        lastAuthUserId.current = null;
        useStore.getState().logout();
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        if (lastAuthUserId.current !== session.user.id) {
          lastAuthUserId.current = session.user.id;
          void establishAuthenticatedUser(session.user);
        }
      }
      if (event === "SIGNED_OUT") {
        lastAuthUserId.current = null;
        useStore.getState().logout();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return <>{children}</>;
}
