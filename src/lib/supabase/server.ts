import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export function hasSupabaseServerConfig(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** Cliente de Supabase para route handlers: lee la sesión desde las cookies. */
export function getSupabaseServer(): SupabaseClient {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Los route handlers no necesitan escribir cookies;
          // el middleware se encarga de refrescar la sesión.
        },
      },
    }
  );
}

/** Devuelve el user id de la sesión de Supabase, o null si no hay sesión. */
export async function getSessionUserId(): Promise<string | null> {
  if (!hasSupabaseServerConfig()) return null;
  try {
    const supabase = getSupabaseServer();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}
