// ─────────────────────────────────────────────────────────────
// CRUD de meta_connections. Solo servidor: usa el cliente admin
// (service role) porque la tabla no tiene policies de RLS para
// el cliente — los tokens jamás llegan al frontend.
// ─────────────────────────────────────────────────────────────
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { encryptToken } from "./crypto";

export type MetaConnectionStatus = "active" | "revoked" | "error";

/** Fila tal como se guarda (tokens cifrados). */
export type MetaConnectionRow = {
  user_id: string;
  business_id: string;
  meta_user_id: string;
  page_id: string | null;
  page_name: string | null;
  ig_user_id: string | null;
  ig_username: string | null;
  user_access_token_enc: string;
  page_access_token_enc: string | null;
  token_expires_at: string | null;
  scopes: string[];
  status: MetaConnectionStatus;
  connected_at: string;
  updated_at: string;
};

/** Vista segura para el cliente: sin tokens. */
export type MetaConnectionPublic = {
  businessId: string;
  pageId: string | null;
  pageName: string | null;
  igUserId: string | null;
  igUsername: string | null;
  status: MetaConnectionStatus;
  tokenExpiresAt: string | null;
  connectedAt: string;
};

export function toPublic(row: MetaConnectionRow): MetaConnectionPublic {
  return {
    businessId: row.business_id,
    pageId: row.page_id,
    pageName: row.page_name,
    igUserId: row.ig_user_id,
    igUsername: row.ig_username,
    status: row.status,
    tokenExpiresAt: row.token_expires_at,
    connectedAt: row.connected_at,
  };
}

export async function saveConnection(input: {
  userId: string;
  businessId: string;
  metaUserId: string;
  pageId: string | null;
  pageName: string | null;
  igUserId: string | null;
  igUsername: string | null;
  userAccessToken: string;
  pageAccessToken: string | null;
  tokenExpiresAt: Date | null;
  scopes: string[];
}): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("meta_connections").upsert(
    {
      user_id: input.userId,
      business_id: input.businessId,
      meta_user_id: input.metaUserId,
      page_id: input.pageId,
      page_name: input.pageName,
      ig_user_id: input.igUserId,
      ig_username: input.igUsername,
      user_access_token_enc: encryptToken(input.userAccessToken),
      page_access_token_enc: input.pageAccessToken
        ? encryptToken(input.pageAccessToken)
        : null,
      token_expires_at: input.tokenExpiresAt?.toISOString() ?? null,
      scopes: input.scopes,
      status: "active",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,business_id" }
  );
  if (error) throw new Error(`Error guardando conexión Meta: ${error.message}`);
}

export async function getConnection(
  userId: string,
  businessId: string
): Promise<MetaConnectionRow | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("meta_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (error) throw new Error(`Error leyendo conexión Meta: ${error.message}`);
  return (data as MetaConnectionRow | null) ?? null;
}

/** Marca como revocadas todas las conexiones de un usuario de Meta (webhook deauthorize). */
export async function revokeByMetaUserId(metaUserId: string): Promise<number> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("meta_connections")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("meta_user_id", metaUserId)
    .select("business_id");
  if (error) throw new Error(`Error revocando conexiones Meta: ${error.message}`);
  return data?.length ?? 0;
}

/** Desconexión manual desde Settings: borra la fila (tokens incluidos). */
export async function deleteConnection(userId: string, businessId: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("meta_connections")
    .delete()
    .eq("user_id", userId)
    .eq("business_id", businessId);
  if (error) throw new Error(`Error eliminando conexión Meta: ${error.message}`);
}
