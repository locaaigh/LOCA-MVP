import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let admin: SupabaseClient | null = null;

export function hasSupabaseAdminConfig(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Cliente admin con service role key: salta RLS.
 * SOLO usar en el servidor (route handlers / repositorio).
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!hasSupabaseAdminConfig()) {
    throw new Error("Supabase no está configurado (SUPABASE_SERVICE_ROLE_KEY)");
  }
  if (!admin) {
    admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          // CRÍTICO: sin esto, Next/Vercel puede meter los fetch de supabase-js
          // en el Data Cache (compartido por deployment) y servir datos VIEJOS
          // aunque la ruta sea force-dynamic. Caso real: /api/onboarding/
          // field-config devolvía la config de hace 3 días desde 5 lambdas
          // distintas. Los datos de DB jamás deben cachearse en el fetch.
          fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
        },
      }
    );
  }
  return admin;
}
