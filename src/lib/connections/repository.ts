// ─────────────────────────────────────────────────────────────
// CRUD de social_connections (Facebook, Instagram, LinkedIn).
// Solo servidor: usa el cliente admin (service role) porque la tabla no
// tiene policies de RLS para el cliente — los tokens jamás llegan al
// frontend.
//
// Un negocio puede tener una conexión por proveedor: la PK es
// (user_id, business_id, provider). Ver migración 0007.
// ─────────────────────────────────────────────────────────────
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { encryptToken } from "./crypto";

export type ConnectionProvider = "facebook" | "instagram" | "linkedin";
export type ConnectionStatus = "active" | "revoked" | "error";

const TABLE = "social_connections";

/** Fila tal como se guarda (tokens cifrados). */
export type ConnectionRow = {
  user_id: string;
  business_id: string;
  provider: ConnectionProvider;
  /** Id del usuario en la plataforma (quién conectó). */
  provider_user_id: string;
  /** Cuenta destino donde se publica: página de FB, cuenta de IG, u organización de LinkedIn. */
  account_id: string | null;
  account_name: string | null;
  /** Solo provider="facebook": la cuenta de IG Business vinculada a la página. */
  ig_user_id: string | null;
  ig_username: string | null;
  user_access_token_enc: string;
  /** Solo provider="facebook": el Page token, que es con el que se publica. */
  page_access_token_enc: string | null;
  /** Solo provider="linkedin": Meta e Instagram renuevan intercambiando el token vigente. */
  refresh_token_enc: string | null;
  token_expires_at: string | null;
  scopes: string[];
  status: ConnectionStatus;
  connected_at: string;
  updated_at: string;
};

/** Vista segura para el cliente: sin tokens. */
export type ConnectionPublic = {
  businessId: string;
  provider: ConnectionProvider;
  accountId: string | null;
  accountName: string | null;
  igUserId: string | null;
  igUsername: string | null;
  status: ConnectionStatus;
  tokenExpiresAt: string | null;
  connectedAt: string;
};

export function toPublic(row: ConnectionRow): ConnectionPublic {
  return {
    businessId: row.business_id,
    provider: row.provider,
    accountId: row.account_id,
    accountName: row.account_name,
    igUserId: row.ig_user_id,
    igUsername: row.ig_username,
    status: row.status,
    tokenExpiresAt: row.token_expires_at,
    connectedAt: row.connected_at,
  };
}

/**
 * Token con el que se publica. En Facebook se publica con el Page token,
 * no con el del usuario; en Instagram y LinkedIn hay uno solo.
 * Devuelve el valor CIFRADO — desencriptar en el punto de uso.
 */
export function publishTokenEnc(row: ConnectionRow): string {
  return row.page_access_token_enc ?? row.user_access_token_enc;
}

export async function saveConnection(input: {
  userId: string;
  businessId: string;
  provider: ConnectionProvider;
  providerUserId: string;
  accountId: string | null;
  accountName: string | null;
  igUserId?: string | null;
  igUsername?: string | null;
  userAccessToken: string;
  pageAccessToken?: string | null;
  refreshToken?: string | null;
  tokenExpiresAt: Date | null;
  scopes: string[];
}): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from(TABLE).upsert(
    {
      user_id: input.userId,
      business_id: input.businessId,
      provider: input.provider,
      provider_user_id: input.providerUserId,
      account_id: input.accountId,
      account_name: input.accountName,
      ig_user_id: input.igUserId ?? null,
      ig_username: input.igUsername ?? null,
      user_access_token_enc: encryptToken(input.userAccessToken),
      page_access_token_enc: input.pageAccessToken
        ? encryptToken(input.pageAccessToken)
        : null,
      refresh_token_enc: input.refreshToken ? encryptToken(input.refreshToken) : null,
      token_expires_at: input.tokenExpiresAt?.toISOString() ?? null,
      scopes: input.scopes,
      status: "active",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,business_id,provider" }
  );
  if (error) throw new Error(`Error guardando conexión ${input.provider}: ${error.message}`);
}

export async function getConnection(
  userId: string,
  businessId: string,
  provider: ConnectionProvider
): Promise<ConnectionRow | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .eq("business_id", businessId)
    .eq("provider", provider)
    .maybeSingle();
  if (error) throw new Error(`Error leyendo conexión ${provider}: ${error.message}`);
  return (data as ConnectionRow | null) ?? null;
}

/** Todas las conexiones de un negocio: la UI de Settings las muestra juntas. */
export async function listConnections(
  userId: string,
  businessId: string
): Promise<ConnectionRow[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .eq("business_id", businessId);
  if (error) throw new Error(`Error listando conexiones: ${error.message}`);
  return (data ?? []) as ConnectionRow[];
}

/**
 * Marca como revocadas las conexiones de un usuario de la plataforma
 * (webhook de deauthorize). Llega el id en la plataforma, sin negocio.
 */
export async function revokeByProviderUserId(
  provider: ConnectionProvider,
  providerUserId: string
): Promise<number> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from(TABLE)
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("provider", provider)
    .eq("provider_user_id", providerUserId)
    .select("business_id");
  if (error) throw new Error(`Error revocando conexiones ${provider}: ${error.message}`);
  return data?.length ?? 0;
}

/** Desconexión manual desde Settings: borra la fila (tokens incluidos). */
export async function deleteConnection(
  userId: string,
  businessId: string,
  provider: ConnectionProvider
): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from(TABLE)
    .delete()
    .eq("user_id", userId)
    .eq("business_id", businessId)
    .eq("provider", provider);
  if (error) throw new Error(`Error eliminando conexión ${provider}: ${error.message}`);
}
