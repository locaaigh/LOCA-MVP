import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { User } from "@/lib/types";

export function toLocaUser(u: SupabaseUser): User {
  return {
    id: u.id,
    email: u.email || "",
    name: (u.user_metadata?.name as string) || u.email?.split("@")[0] || "Usuario",
    createdAt: u.created_at,
  };
}
