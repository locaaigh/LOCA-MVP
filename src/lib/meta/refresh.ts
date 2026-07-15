// ─────────────────────────────────────────────────────────────
// Renovación de tokens de larga duración antes de que venzan.
// El user token de Meta dura ~60 días; lo renovamos cuando le
// quedan menos de 14. Los Page tokens derivados también se
// refrescan por higiene (se re-obtienen de /me/accounts).
// ─────────────────────────────────────────────────────────────
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { decryptToken, encryptToken } from "./crypto";
import { exchangeForLongLivedToken } from "./oauth";
import { fetchPages } from "./accounts";
import type { MetaConnectionRow } from "./repository";

const REFRESH_WINDOW_DAYS = 14;

export type RefreshSummary = {
  checked: number;
  refreshed: number;
  failed: { businessId: string; error: string }[];
};

export async function refreshExpiringTokens(): Promise<RefreshSummary> {
  const admin = getSupabaseAdmin();
  const cutoff = new Date(Date.now() + REFRESH_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from("meta_connections")
    .select("*")
    .eq("status", "active")
    .lt("token_expires_at", cutoff);
  if (error) throw new Error(`Error buscando tokens por vencer: ${error.message}`);

  const rows = (data ?? []) as MetaConnectionRow[];
  const summary: RefreshSummary = { checked: rows.length, refreshed: 0, failed: [] };

  for (const row of rows) {
    try {
      const currentToken = decryptToken(row.user_access_token_enc);
      const renewed = await exchangeForLongLivedToken(currentToken);
      const expiresAt = renewed.expires_in
        ? new Date(Date.now() + renewed.expires_in * 1000)
        : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

      // Re-obtener el Page token con el token nuevo (si hay page conectada)
      let pageTokenEnc = row.page_access_token_enc;
      if (row.page_id) {
        try {
          const pages = await fetchPages(renewed.access_token);
          const page = pages.find((p) => p.id === row.page_id);
          if (page) pageTokenEnc = encryptToken(page.access_token);
        } catch {
          // Si falla, conservamos el Page token anterior (no expira solo)
        }
      }

      const { error: upErr } = await admin
        .from("meta_connections")
        .update({
          user_access_token_enc: encryptToken(renewed.access_token),
          page_access_token_enc: pageTokenEnc,
          token_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", row.user_id)
        .eq("business_id", row.business_id);
      if (upErr) throw new Error(upErr.message);

      summary.refreshed++;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "error desconocido";
      summary.failed.push({ businessId: row.business_id, error: msg });
      // Marcar en error para que la UI ofrezca reconectar
      await admin
        .from("meta_connections")
        .update({ status: "error", updated_at: new Date().toISOString() })
        .eq("user_id", row.user_id)
        .eq("business_id", row.business_id);
    }
  }

  return summary;
}
