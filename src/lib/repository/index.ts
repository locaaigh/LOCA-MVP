import { hasSupabaseAdminConfig } from "@/lib/supabase/admin";
import { getMemoryRepository } from "./server-memory";
import { supabaseRepository } from "./supabase-repo";
import type { DataRepository } from "./types";

export type { DataRepository } from "./types";

export interface RepoContext {
  userId: string;
  repo: DataRepository;
  /** true si el userId viene de una sesión real de Supabase */
  isAuthenticated: boolean;
}

/**
 * Usuarios con sesión de Supabase → PostgreSQL.
 * Modo demo (sin sesión, header x-loca-user-id) → memoria del servidor.
 */
export function repositoryFor(isAuthenticated: boolean): DataRepository {
  if (isAuthenticated && hasSupabaseAdminConfig()) return supabaseRepository;
  return getMemoryRepository();
}
