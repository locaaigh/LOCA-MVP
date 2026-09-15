// ─────────────────────────────────────────────────────────────
// Renovación de tokens de LinkedIn antes de que venzan. El access token
// dura ~60 días y se renueva con el refresh_token. Corre en el mismo cron
// que Meta e Instagram.
// ─────────────────────────────────────────────────────────────
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { decryptToken, encryptToken } from "@/lib/connections/crypto";
import { refreshAccessToken } from "./oauth";
import type { ConnectionRow } from "@/lib/connections/repository";

const REFRESH_WINDOW_DAYS = 14;

export type RefreshSummary = {
  checked: number;
  refreshed: number;
  failed: { businessId: string; error: string }[];
};

export async function refreshExpiringLinkedInTokens(): Promise<RefreshSummary> {
  const admin = getSupabaseAdmin();
  const cutoff = new Date(Date.now() + REFRESH_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from("social_connections")
    .select("*")
    .eq("provider", "linkedin")
    .eq("status", "active")
    .lt("token_expires_at", cutoff);
  if (error) throw new Error(`Error buscando tokens de LinkedIn por vencer: ${error.message}`);

  const rows = (data ?? []) as ConnectionRow[];
  const summary: RefreshSummary = { checked: rows.length, refreshed: 0, failed: [] };

  for (const row of rows) {
    try {
      if (!row.refresh_token_enc) throw new Error("sin refresh_token");
      const renewed = await refreshAccessToken(decryptToken(row.refresh_token_enc));
      const expiresAt = renewed.expires_in
        ? new Date(Date.now() + renewed.expires_in * 1000)
        : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

      const { error: upErr } = await admin
        .from("social_connections")
        .update({
          user_access_token_enc: encryptToken(renewed.access_token),
          // LinkedIn puede rotar el refresh token; si viene uno nuevo, lo guardamos.
          refresh_token_enc: renewed.refresh_token
            ? encryptToken(renewed.refresh_token)
            : row.refresh_token_enc,
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
