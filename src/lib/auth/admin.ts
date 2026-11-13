// ─────────────────────────────────────────────────────────────
// ¿El usuario de la sesión es admin de la plataforma?
// El rol vive en la tabla `admin_users` (migración 0009). Se consulta con el
// cliente de la SESIÓN: la policy de RLS solo deja leer la propia fila, así
// que "0 filas" = no sos admin. FAIL-CLOSED: ante cualquier duda (sin config,
// sin sesión, Supabase caído), la respuesta es null.
// SOLO server-side (route handlers / server components).
// ─────────────────────────────────────────────────────────────
import { getSupabaseServer, hasSupabaseServerConfig } from "@/lib/supabase/server";

export interface AdminSession {
  userId: string;
  email: string;
}

export async function getAdminSession(): Promise<AdminSession | null> {
  if (!hasSupabaseServerConfig()) return null;
  try {
    const supabase = getSupabaseServer();
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return null;
    const { data: row, error } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error || !row) return null;
    return { userId: user.id, email: user.email || "" };
  } catch {
    return null;
  }
}
