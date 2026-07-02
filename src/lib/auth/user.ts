import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { User } from "@/lib/types";
import { hasSupabaseClientConfig } from "@/lib/supabase/client";

export function toLocaUser(u: SupabaseUser): User {
  return {
    id: u.id,
    email: u.email || "",
    name: (u.user_metadata?.name as string) || u.email?.split("@")[0] || "Usuario",
    createdAt: u.created_at,
  };
}

/** Usuario creado solo en localStorage (login/signup sin Supabase). */
export function isLocalOnlyUser(user: User | null | undefined): boolean {
  if (!user) return true;
  if (user.isDemo) return true;
  if (user.id.startsWith("user_")) return true;
  // Legacy: finish() anterior creaba emails negocio_*@loca.app sin cuenta real
  if (/^negocio_\d+@loca\.app$/i.test(user.email)) return true;
  return false;
}

/** Con Supabase activo, hace falta cuenta real antes de generar estrategia. */
export function requiresAuthForStrategy(): boolean {
  return hasSupabaseClientConfig();
}

/** ¿Puede ir a /strategy?generate=1 con este usuario? */
export function canGenerateStrategy(user: User | null | undefined): boolean {
  if (!requiresAuthForStrategy()) return true;
  return !!user && !isLocalOnlyUser(user);
}
