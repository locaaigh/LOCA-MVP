// ─────────────────────────────────────────────────────────────
// Renovación de tokens de larga duración de Instagram antes de que
// venzan. El token dura ~60 días y se renueva por SU propio endpoint
// (ig_refresh_token), distinto al de Meta. Este paso corre en el mismo
// cron que refreshExpiringTokens() de Meta.
// ─────────────────────────────────────────────────────────────
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { decryptToken, encryptToken } from "@/lib/connections/crypto";
import { refreshLongLivedToken } from "./oauth";
import type { ConnectionRow } from "@/lib/connections/repository";

const REFRESH_WINDOW_DAYS = 14;

export type RefreshSummary = {
  checked: number;
  refreshed: number;
  failed: { businessId: string; error: string }[];
};

export async function refreshExpiringInstagramTokens(): Promise<RefreshSummary> {
  const admin = getSupabaseAdmin();
  const cutoff = new Date(Date.now() + REFRESH_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from("social_connections")
    .select("*")
    .eq("provider", "instagram")
    .eq("status", "active")
    .lt("token_expires_at", cutoff);
  if (error) throw new Error(`Error buscando tokens de IG por vencer: ${error.message}`);

  const rows = (data ?? []) as ConnectionRow[];
  const summary: RefreshSummary = { checked: rows.length, refreshed: 0, failed: [] };

  for (const row of rows) {
    try {
      const currentToken = decryptToken(row.user_access_token_enc);
      const renewed = await refreshLongLivedToken(currentToken);
      const expiresAt = renewed.expires_in
        ? new Date(Date.now() + renewed.expires_in * 1000)
        : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

      const { error: upErr } = await admin
        .from("social_connections")
        .update({
          user_access_token_enc: encryptToken(renewed.access_token),
          token_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", row.user_id)
        .eq("business_id", row.business_id)
        .eq("provider", row.provider);
      if (upErr) throw new Error(upErr.message);

      summary.refreshed++;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "error desconocido";
      summary.failed.push({ businessId: row.business_id, error: msg });
      await admin
        .from("social_connections")
        .update({ status: "error", updated_at: new Date().toISOString() })
        .eq("user_id", row.user_id)
        .eq("business_id", row.business_id)
        .eq("provider", row.provider);
    }
  }

  return summary;
}
