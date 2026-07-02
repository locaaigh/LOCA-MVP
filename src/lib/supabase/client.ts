"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function hasSupabaseClientConfig(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** Cliente de Supabase para el navegador (auth con cookies compartidas con el server). */
export function getSupabaseBrowser(): SupabaseClient {
  if (!hasSupabaseClientConfig()) {
    throw new Error("Supabase no está configurado (NEXT_PUBLIC_SUPABASE_URL/ANON_KEY)");
  }
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}
