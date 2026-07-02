"use client";

import type { User as SupabaseUser } from "@supabase/supabase-js";
import { getSupabaseBrowser, hasSupabaseClientConfig } from "@/lib/supabase/client";
import { toLocaUser } from "@/lib/auth/user";
import { useStore } from "@/lib/store";

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

/** Cierra sesión de Supabase si está configurado (no-op en modo local). */
export async function signOutSupabase(): Promise<void> {
  if (!hasSupabaseClientConfig()) return;
  await getSupabaseBrowser().auth.signOut();
}

/**
 * Establece el usuario autenticado. Si cambió la cuenta, limpia datos locales
 * antes de hidratar desde el servidor (evita mezclar cuentas).
 */
export async function establishAuthenticatedUser(supabaseUser: SupabaseUser) {
  const newUser = toLocaUser(supabaseUser);
  const prev = useStore.getState().user;
  if (prev?.id !== newUser.id) {
    useStore.getState().clearUserData();
  }
  useStore.getState().setUser(newUser);
  await hydrateFromServer();
}

/**
 * Entra en modo demo: cierra sesión real, limpia datos locales y carga
 * los negocios demo sin mezclar con la cuenta anterior.
 */
export async function enterDemoMode(): Promise<void> {
  await signOutSupabase();
  const store = useStore.getState();
  store.clearUserData();
  store.loginDemo();
}
